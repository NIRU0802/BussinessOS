import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from '../../../prisma/prisma.service';
import { MinioService } from '../../../common/storage/minio.service';
import { SuperAdminAuditService } from '../common/super-admin-audit.service';
import { AuditContext } from '../tenant-management/tenant-management.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

export interface DependencyHealth {
  up: boolean;
  latencyMs: number;
  error?: string;
}

export interface SystemHealthReport {
  database: DependencyHealth;
  redis: DependencyHealth;
  minio: DependencyHealth;
  overallStatus: 'healthy' | 'degraded' | 'down';
  checkedAt: string;
}

@Injectable()
export class MonitoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly configService: ConfigService,
    private readonly auditService: SuperAdminAuditService,
  ) {}

  // ============================================================
  // SYSTEM HEALTH — basic up/down + latency per core dependency.
  // No Grafana/Prometheus/tracing (explicitly out of scope) —
  // just simple service-up checks, per spec.
  // ============================================================
  async getSystemHealth(ctx: AuditContext): Promise<SystemHealthReport> {
    const [database, redis, minio] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.minioService.checkHealth().then((r) => ({ ...r })),
    ]);

    const allUp = database.up && redis.up && minio.up;
    const allDown = !database.up && !redis.up && !minio.up;
    const overallStatus: 'healthy' | 'degraded' | 'down' = allUp
      ? 'healthy'
      : allDown
        ? 'down'
        : 'degraded';

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: null,
      action: 'monitoring.view_system_health',
      resourceType: 'system_health',
      metadata: { overallStatus },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return {
      database,
      redis,
      minio,
      overallStatus,
      checkedAt: new Date().toISOString(),
    };
  }

  // ============================================================
  // STORAGE STATS — total platform storage used, shown on the
  // System Overview page below the health monitors.
  // ============================================================
  async getStorageStats(ctx: AuditContext) {
    const totalBytes = await this.minioService.getTotalStorageBytes();

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: null,
      action: 'monitoring.view_storage_stats',
      resourceType: 'storage_stats',
      metadata: { totalBytes },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return {
      totalBytes,
      checkedAt: new Date().toISOString(),
    };
  }

  // ============================================================
  // DASHBOARD SUMMARY — everything the System Overview page needs
  // in one call: platform totals, recent activity, top storage
  // consumers, subscription breakdown, widget adoption.
  // ============================================================
  async getDashboardSummary(ctx: AuditContext) {
    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalBranches,
      recentActivity,
      allTenants,
      subscriptions,
      tenantWidgetCounts,
      allWidgets,
    ] = await Promise.all([
      this.prisma.tenant.count({ where: { deletedAt: null } }),
      this.prisma.tenant.count({ where: { deletedAt: null, isActive: true } }),
      this.prisma.tenant.count({ where: { deletedAt: null, isActive: false } }),
      this.prisma.branch.count({ where: { deletedAt: null } }),
      this.prisma.superAdminAuditLog.findMany({
        orderBy: { created_at: 'desc' },
        take: 8,
        include: { superAdmin: { select: { full_name: true, email: true } } },
      }),
      this.prisma.tenant.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
      }),
      this.prisma.subscription.findMany({
        where: { status: { in: ['active', 'trialing', 'past_due'] } },
        include: {
          plan: { select: { name: true, price: true, billingCycle: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenantWidget.groupBy({
        by: ['widgetKey'],
        where: { status: 'active' },
        _count: { widgetKey: true },
      }),
      this.prisma.featureWidget.findMany({
        select: { widgetKey: true, name: true },
      }),
    ]);

    // Top storage consumers - compute per tenant, take top 5
    const storageByTenant = await Promise.all(
      allTenants.map(async (t) => ({
        id: t.id,
        name: t.name,
        bytes: await this.minioService.getTenantStorageBytes(t.id),
      })),
    );
    const topStorageTenants = storageByTenant
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 5);

    // Subscription breakdown by plan name
    const latestSubByTenant = new Map<string, (typeof subscriptions)[number]>();
    for (const sub of subscriptions) {
      if (!latestSubByTenant.has(sub.tenantId)) {
        latestSubByTenant.set(sub.tenantId, sub);
      }
    }
    const planCounts = new Map<string, number>();
    for (const sub of latestSubByTenant.values()) {
      const planName = sub.plan.name;
      planCounts.set(planName, (planCounts.get(planName) ?? 0) + 1);
    }
    const tenantsWithNoPlan = totalTenants - latestSubByTenant.size;

    // Revenue - sum of active subscriptions' plan prices, normalized to
    // monthly (yearly plans divided by 12) for a consistent MRR figure.
    let monthlyRecurringRevenue = 0;
    let totalActiveSubscriptions = 0;
    for (const sub of latestSubByTenant.values()) {
      if (sub.status !== 'active') continue;
      totalActiveSubscriptions += 1;
      const price = Number(sub.plan.price);
      monthlyRecurringRevenue +=
        sub.plan.billingCycle === 'yearly' ? price / 12 : price;
    }

    // Widget adoption - map widget key to name and count
    const widgetNameMap = new Map(allWidgets.map((w) => [w.widgetKey, w.name]));
    const widgetAdoption = tenantWidgetCounts
      .map((tw) => ({
        widgetKey: tw.widgetKey,
        name: widgetNameMap.get(tw.widgetKey) ?? tw.widgetKey,
        activeTenantCount: tw._count.widgetKey,
      }))
      .sort((a, b) => b.activeTenantCount - a.activeTenantCount);

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: null,
      action: 'monitoring.view_dashboard_summary',
      resourceType: 'dashboard_summary',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return {
      platformTotals: {
        totalTenants,
        activeTenants,
        suspendedTenants,
        totalBranches,
      },
      revenue: {
        monthlyRecurringRevenue,
        totalActiveSubscriptions,
      },
      recentActivity: recentActivity.map((log) => ({
        action: log.action,
        adminName: log.superAdmin.full_name,
        adminType: log.admin_type_at_time,
        targetTenantId: log.target_tenant_id,
        createdAt: log.created_at,
      })),
      topStorageTenants,
      subscriptionBreakdown: {
        byPlan: Array.from(planCounts.entries()).map(([planName, count]) => ({
          planName,
          count,
        })),
        noPlan: tenantsWithNoPlan,
      },
      widgetAdoption,
    };
  }

  private async checkDatabase(): Promise<DependencyHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { up: true, latencyMs: Date.now() - start };
    } catch (err) {
      return {
        up: false,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'Unknown database error',
      };
    }
  }

  private async checkRedis(): Promise<DependencyHealth> {
    const start = Date.now();
    const client = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: Number(this.configService.get<string>('REDIS_PORT', '6379')),
      lazyConnect: true,
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
    });

    try {
      await client.connect();
      const pong = await client.ping();
      client.disconnect();
      return {
        up: pong === 'PONG',
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      client.disconnect();
      return {
        up: false,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'Unknown Redis error',
      };
    }
  }

  // ============================================================
  // AUDIT LOG VIEWER — cross-tenant, filterable. Reuses the
  // SuperAdminAuditLog data written by every other module's
  // audit calls. This endpoint itself is also audited.
  // ============================================================
  async getAuditLogs(query: AuditLogQueryDto, ctx: AuditContext) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize =
      query.pageSize && query.pageSize > 0 && query.pageSize <= 200
        ? query.pageSize
        : 50;

    const where: any = {};

    if (query.tenantId) {
      where.target_tenant_id = query.tenantId;
    }
    if (query.superAdminId) {
      where.super_admin_id = query.superAdminId;
    }
    if (query.action) {
      where.action = { contains: query.action, mode: 'insensitive' };
    }
    if (query.fromDate || query.toDate) {
      where.created_at = {};
      if (query.fromDate) where.created_at.gte = new Date(query.fromDate);
      if (query.toDate) where.created_at.lte = new Date(query.toDate);
    }

    const [logs, total] = await Promise.all([
      this.prisma.superAdminAuditLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { created_at: 'desc' },
        include: {
          superAdmin: {
            select: { email: true, full_name: true },
          },
        },
      }),
      this.prisma.superAdminAuditLog.count({ where }),
    ]);

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: query.tenantId ?? null,
      action: 'monitoring.view_audit_logs',
      resourceType: 'audit_log',
      metadata: {
        filters: {
          tenantId: query.tenantId,
          superAdminId: query.superAdminId,
          action: query.action,
          fromDate: query.fromDate,
          toDate: query.toDate,
        },
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return {
      data: logs.map((log) => ({
        id: log.id,
        action: log.action,
        resourceType: log.resource_type,
        resourceId: log.resource_id,
        targetTenantId: log.target_tenant_id,
        adminEmail: log.superAdmin.email,
        adminName: log.superAdmin.full_name,
        adminType: log.admin_type_at_time,
        metadata: log.metadata,
        ipAddress: log.ip_address,
        createdAt: log.created_at,
      })),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }
}
