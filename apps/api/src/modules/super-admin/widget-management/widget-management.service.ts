import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SuperAdminAuditService } from '../common/super-admin-audit.service';
import { AuditContext } from '../tenant-management/tenant-management.service';
import { UpdateWidgetStatusDto } from './dto/update-widget-status.dto';

@Injectable()
export class WidgetManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: SuperAdminAuditService,
  ) {}

  async listWidgets(ctx: AuditContext) {
    const widgets = await this.prisma.featureWidget.findMany({
      include: {
        _count: {
          select: {
            tenantWidgets: { where: { status: 'active' } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: null,
      action: 'widget.list',
      resourceType: 'widget',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return widgets.map((w) => ({
      widgetKey: w.widgetKey,
      name: w.name,
      description: w.description,
      status: w.status,
      activeTenantCount: w._count.tenantWidgets,
      createdAt: w.createdAt,
    }));
  }

  async updateWidgetStatus(
    widgetKey: string,
    dto: UpdateWidgetStatusDto,
    ctx: AuditContext,
  ) {
    const widget = await this.prisma.featureWidget.findUnique({
      where: { widgetKey },
    });

    if (!widget) {
      throw new NotFoundException(`Widget "${widgetKey}" not found`);
    }

    const updateData: { status?: 'active' | 'beta' | 'deprecated' } = {};

    if (dto.isEnabledGlobally === false) {
      updateData.status = 'deprecated';
    } else if (dto.status) {
      updateData.status = dto.status;
    }

    const updated = await this.prisma.featureWidget.update({
      where: { widgetKey },
      data: updateData,
    });

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: null,
      action: 'widget.update_status',
      resourceType: 'widget',
      resourceId: widgetKey,
      metadata: {
        widgetName: widget.name,
        previousStatus: widget.status,
        newStatus: updated.status,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return updated;
  }

  // ============================================================
  // TENANT-LEVEL WIDGET CONTROL
  // This writes to TenantWidget - the table the rest of the platform
  // (Orders/Menu/KDS/etc.) already checks for feature-gating. This
  // is the REAL widget control, works regardless of branch count.
  // ============================================================

  async listTenantWidgets(tenantId: string, ctx: AuditContext) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant "${tenantId}" not found`);
    }

    const [allWidgets, tenantWidgets] = await Promise.all([
      this.prisma.featureWidget.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.tenantWidget.findMany({ where: { tenantId } }),
    ]);

    const activeMap = new Map(tenantWidgets.map((tw) => [tw.widgetKey, tw]));

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: tenantId,
      action: 'tenant_widget.list',
      resourceType: 'tenant_widget',
      resourceId: tenantId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return allWidgets.map((w) => {
      const tw = activeMap.get(w.widgetKey);
      return {
        widgetKey: w.widgetKey,
        name: w.name,
        description: w.description,
        platformStatus: w.status,
        isActiveForTenant: tw?.status === 'active',
        activatedAt: tw?.activatedAt ?? null,
      };
    });
  }

  async setTenantWidget(
    tenantId: string,
    widgetKey: string,
    isEnabled: boolean,
    ctx: AuditContext,
  ) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant "${tenantId}" not found`);
    }

    const widget = await this.prisma.featureWidget.findUnique({
      where: { widgetKey },
    });
    if (!widget) {
      throw new NotFoundException(`Widget "${widgetKey}" not found`);
    }

    const tenantWidget = await this.prisma.tenantWidget.upsert({
      where: {
        tenantId_widgetKey: { tenantId, widgetKey },
      },
      create: {
        tenantId,
        widgetKey,
        status: isEnabled ? 'active' : 'disabled',
        activatedAt: isEnabled ? new Date() : null,
      },
      update: {
        status: isEnabled ? 'active' : 'disabled',
        activatedAt: isEnabled ? new Date() : null,
      },
    });

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: tenantId,
      action: 'tenant_widget.set',
      resourceType: 'tenant_widget',
      resourceId: tenantId,
      metadata: {
        tenantName: tenant.name,
        widgetKey,
        widgetName: widget.name,
        isEnabled,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return tenantWidget;
  }

  // ============================================================
  // PER-BRANCH WIDGET OVERRIDES
  // Control surface only in this phase - actual enforcement across
  // Orders/Menu/KDS/etc. is a separate future phase, not built yet.
  // ============================================================

  async listBranchOverrides(branchId: string, ctx: AuditContext) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch) {
      throw new NotFoundException(`Branch "${branchId}" not found`);
    }

    const overrides = await this.prisma.branchWidgetOverride.findMany({
      where: { branchId },
      orderBy: { widgetKey: 'asc' },
    });

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: branch.tenantId,
      action: 'branch_widget.list_overrides',
      resourceType: 'branch_widget_override',
      resourceId: branchId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return overrides;
  }

  async setBranchOverride(
    branchId: string,
    widgetKey: string,
    isEnabled: boolean,
    ctx: AuditContext,
  ) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch) {
      throw new NotFoundException(`Branch "${branchId}" not found`);
    }

    const widget = await this.prisma.featureWidget.findUnique({
      where: { widgetKey },
    });
    if (!widget) {
      throw new NotFoundException(`Widget "${widgetKey}" not found`);
    }

    const override = await this.prisma.branchWidgetOverride.upsert({
      where: {
        branchId_widgetKey: { branchId, widgetKey },
      },
      create: {
        tenantId: branch.tenantId,
        branchId,
        widgetKey,
        isEnabled,
      },
      update: { isEnabled },
    });

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: branch.tenantId,
      action: 'branch_widget.set_override',
      resourceType: 'branch_widget_override',
      resourceId: branchId,
      metadata: {
        branchName: branch.name,
        widgetKey,
        widgetName: widget.name,
        isEnabled,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return override;
  }

  async removeBranchOverride(
    branchId: string,
    widgetKey: string,
    ctx: AuditContext,
  ) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch) {
      throw new NotFoundException(`Branch "${branchId}" not found`);
    }

    await this.prisma.branchWidgetOverride.deleteMany({
      where: { branchId, widgetKey },
    });

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: branch.tenantId,
      action: 'branch_widget.remove_override',
      resourceType: 'branch_widget_override',
      resourceId: branchId,
      metadata: { branchName: branch.name, widgetKey },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { branchId, widgetKey, removed: true };
  }
}
