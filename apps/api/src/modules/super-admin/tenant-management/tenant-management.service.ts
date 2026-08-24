import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MinioService } from '../../../common/storage/minio.service';
import { SuperAdminAuditService } from '../common/super-admin-audit.service';
import { TenantListQueryDto } from './dto/tenant-list-query.dto';

export interface AuditContext {
  superAdminId: string;
  adminType: 'GR8' | 'TEAM';
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class TenantManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: SuperAdminAuditService,
    private readonly minioService: MinioService,
  ) {}

  async listTenants(query: TenantListQueryDto, ctx: AuditContext) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize =
      query.pageSize && query.pageSize > 0 && query.pageSize <= 100
        ? query.pageSize
        : 25;

    const where: any = {
      deletedAt: null,
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status === 'suspended') {
      where.isActive = false;
    } else if (query.status === 'active') {
      where.isActive = true;
    }

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          createdAt: true,
          _count: { select: { branches: true } },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    const tenantIds = tenants.map((t) => t.id);
    const subscriptions = await this.prisma.subscription.findMany({
      where: { tenantId: { in: tenantIds } },
      include: { plan: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const latestSubByTenant = new Map<string, (typeof subscriptions)[number]>();
    for (const sub of subscriptions) {
      if (!latestSubByTenant.has(sub.tenantId)) {
        latestSubByTenant.set(sub.tenantId, sub);
      }
    }

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: null,
      action: 'tenant.list',
      resourceType: 'tenant',
      metadata: { search: query.search, status: query.status, page, pageSize },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    const storageByTenant = await Promise.all(
      tenants.map(async (t) => ({
        id: t.id,
        breakdown: await this.minioService.getTenantStorageBreakdown(t.id),
      })),
    );
    const storageMap = new Map(storageByTenant.map((s) => [s.id, s.breakdown]));

    return {
      data: tenants.map((t) => {
        const sub = latestSubByTenant.get(t.id);
        const storage = storageMap.get(t.id) ?? {
          images: 0,
          documents: 0,
          total: 0,
        };
        return {
          id: t.id,
          name: t.name,
          slug: t.slug,
          status: t.isActive ? 'active' : 'suspended',
          branchCount: t._count.branches,
          plan: sub?.plan?.name ?? null,
          subscriptionStatus: sub?.status ?? null,
          storageBytes: storage.total,
          imageStorageBytes: storage.images,
          documentStorageBytes: storage.documents,
          createdAt: t.createdAt,
        };
      }),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async suspendTenant(
    tenantId: string,
    reason: string | undefined,
    ctx: AuditContext,
  ) {
    const tenant = await this.findTenantOrThrow(tenantId);

    if (!tenant.isActive) {
      throw new BadRequestException('Tenant is already suspended');
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive: false },
    });

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: tenantId,
      action: 'tenant.suspend',
      resourceType: 'tenant',
      resourceId: tenantId,
      metadata: { reason: reason ?? null, tenantName: tenant.name },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { id: updated.id, name: updated.name, status: 'suspended' };
  }

  async reactivateTenant(tenantId: string, ctx: AuditContext) {
    const tenant = await this.findTenantOrThrow(tenantId);

    if (tenant.isActive) {
      throw new BadRequestException('Tenant is already active');
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive: true },
    });

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: tenantId,
      action: 'tenant.reactivate',
      resourceType: 'tenant',
      resourceId: tenantId,
      metadata: { tenantName: tenant.name },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { id: updated.id, name: updated.name, status: 'active' };
  }

  async getTenantDetailForTeam(tenantId: string, ctx: AuditContext) {
    const tenant = await this.findTenantOrThrow(tenantId);

    const [
      branches,
      devices,
      tenantWidgets,
      subscription,
      orderCountThisMonth,
      recentAuditEntries,
    ] = await Promise.all([
      this.prisma.branch.findMany({
        where: { tenantId, deletedAt: null },
        select: {
          id: true,
          name: true,
          isActive: true,
          country: true,
          timezone: true,
        },
      }),
      this.prisma.device.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          type: true,
          isActive: true,
          lastSeenAt: true,
          registeredAt: true,
        },
      }),
      this.prisma.tenantWidget.findMany({
        where: { tenantId, status: 'active' },
        include: { widget: { select: { name: true, widgetKey: true } } },
      }),
      this.prisma.subscription.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        include: { plan: { select: { name: true, price: true } } },
      }),
      this.getMonthlyOrderCount(tenantId),
      this.prisma.superAdminAuditLog.findMany({
        where: { target_tenant_id: tenantId },
        orderBy: { created_at: 'desc' },
        take: 20,
        select: {
          action: true,
          resource_type: true,
          admin_type_at_time: true,
          created_at: true,
          metadata: true,
        },
      }),
    ]);

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: tenantId,
      action: 'tenant.view_detail_team',
      resourceType: 'tenant',
      resourceId: tenantId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    const storageBytes =
      await this.minioService.getTenantStorageBytes(tenantId);

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.isActive ? 'active' : 'suspended',
      defaultCurrency: tenant.defaultCurrency,
      defaultLanguage: tenant.defaultLanguage,
      createdAt: tenant.createdAt,
      storageBytes,
      branches: branches.map((b) => ({
        id: b.id,
        name: b.name,
        isActive: b.isActive,
        country: b.country,
        timezone: b.timezone,
      })),
      devices: devices.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        isActive: d.isActive,
        lastSeenAt: d.lastSeenAt,
        registeredAt: d.registeredAt,
      })),
      activeWidgets: tenantWidgets.map((tw) => ({
        key: tw.widgetKey,
        name: tw.widget.name,
        activatedAt: tw.activatedAt,
      })),
      subscription: subscription
        ? {
            planName: subscription.plan.name,
            planPrice: subscription.plan.price,
            status: subscription.status,
            renewalDate: subscription.renewalDate,
          }
        : null,
      usage: {
        ordersThisMonth: orderCountThisMonth,
      },
      recentAuditTrail: recentAuditEntries,
    };
  }

  async getTenantBusinessContentForGr8(tenantId: string, ctx: AuditContext) {
    await this.findTenantOrThrow(tenantId);

    const [recentOrders, customers, menuItems, expenses] = await Promise.all([
      this.prisma.order.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          channel: true,
          status: true,
          total: true,
          createdAt: true,
          branchId: true,
        },
      }),
      this.prisma.customer.findMany({
        where: { tenantId },
        take: 50,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          totalOrders: true,
          totalSpent: true,
        },
      }),
      this.prisma.menuItem.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, name: true, basePrice: true, isActive: true },
      }),
      this.prisma.expense.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { expenseDate: 'desc' },
        take: 50,
        select: {
          id: true,
          amount: true,
          description: true,
          expenseDate: true,
        },
      }),
    ]);

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: tenantId,
      action: 'tenant.view_business_content_gr8',
      resourceType: 'tenant',
      resourceId: tenantId,
      metadata: {
        recordCounts: {
          orders: recentOrders.length,
          customers: customers.length,
          menuItems: menuItems.length,
          expenses: expenses.length,
        },
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { recentOrders, customers, menuItems, expenses };
  }

  private async findTenantOrThrow(tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant "${tenantId}" not found`);
    }
    return tenant;
  }

  private async getMonthlyOrderCount(tenantId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    return this.prisma.order.count({
      where: {
        tenantId,
        createdAt: { gte: startOfMonth },
      },
    });
  }
}
