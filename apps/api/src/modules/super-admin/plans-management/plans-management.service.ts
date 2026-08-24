import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SuperAdminAuditService } from '../common/super-admin-audit.service';
import { AuditContext } from '../tenant-management/tenant-management.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { AssignPlanDto } from './dto/assign-plan.dto';

@Injectable()
export class PlansManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: SuperAdminAuditService,
  ) {}

  async listPlans(ctx: AuditContext) {
    const plans = await this.prisma.plan.findMany({
      include: {
        limits: true,
        widgets: true,
        _count: { select: { subscriptions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: null,
      action: 'plan.list',
      resourceType: 'plan',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return plans.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      billingCycle: p.billingCycle,
      description: p.description,
      isActive: p.isActive,
      limits: p.limits,
      widgetKeys: p.widgets.map((w) => w.widgetKey),
      subscriberCount: p._count.subscriptions,
      createdAt: p.createdAt,
    }));
  }

  async getPlan(planId: string, ctx: AuditContext) {
    const plan = await this.findPlanOrThrow(planId);

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: null,
      action: 'plan.view',
      resourceType: 'plan',
      resourceId: planId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return plan;
  }

  async createPlan(dto: CreatePlanDto, ctx: AuditContext) {
    const created = await this.prisma.plan.create({
      data: {
        name: dto.name,
        price: dto.price,
        billingCycle: dto.billingCycle,
        description: dto.description,
        limits: {
          create: {
            maxBranches: dto.maxBranches,
            maxUsers: dto.maxUsers,
            maxDevices: dto.maxDevices,
            maxStorageMb: dto.maxStorageMb,
            maxMonthlyOrders: dto.maxMonthlyOrders,
          },
        },
        widgets: dto.widgetKeys
          ? {
              create: dto.widgetKeys.map((widgetKey) => ({ widgetKey })),
            }
          : undefined,
      },
      include: { limits: true, widgets: true },
    });

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: null,
      action: 'plan.create',
      resourceType: 'plan',
      resourceId: created.id,
      metadata: { name: created.name, price: created.price },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return created;
  }

  async updatePlan(planId: string, dto: UpdatePlanDto, ctx: AuditContext) {
    await this.findPlanOrThrow(planId);

    const updated = await this.prisma.plan.update({
      where: { id: planId },
      data: {
        name: dto.name,
        price: dto.price,
        billingCycle: dto.billingCycle,
        description: dto.description,
        isActive: dto.isActive,
      },
      include: { limits: true, widgets: true },
    });

    if (
      dto.maxBranches !== undefined ||
      dto.maxUsers !== undefined ||
      dto.maxDevices !== undefined ||
      dto.maxStorageMb !== undefined ||
      dto.maxMonthlyOrders !== undefined
    ) {
      await this.prisma.planLimit.upsert({
        where: { planId },
        create: {
          planId,
          maxBranches: dto.maxBranches,
          maxUsers: dto.maxUsers,
          maxDevices: dto.maxDevices,
          maxStorageMb: dto.maxStorageMb,
          maxMonthlyOrders: dto.maxMonthlyOrders,
        },
        update: {
          maxBranches: dto.maxBranches,
          maxUsers: dto.maxUsers,
          maxDevices: dto.maxDevices,
          maxStorageMb: dto.maxStorageMb,
          maxMonthlyOrders: dto.maxMonthlyOrders,
        },
      });
    }

    if (dto.widgetKeys) {
      await this.prisma.planWidget.deleteMany({ where: { planId } });
      await this.prisma.planWidget.createMany({
        data: dto.widgetKeys.map((widgetKey) => ({ planId, widgetKey })),
      });
    }

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: null,
      action: 'plan.update',
      resourceType: 'plan',
      resourceId: planId,
      metadata: { changes: dto },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.findPlanOrThrow(planId);
  }

  async deletePlan(planId: string, ctx: AuditContext) {
    const plan = await this.findPlanOrThrow(planId);

    const activeSubCount = await this.prisma.subscription.count({
      where: { planId, status: { in: ['active', 'trialing', 'past_due'] } },
    });

    if (activeSubCount > 0) {
      throw new BadRequestException(
        `Cannot delete plan "${plan.name}" — ${activeSubCount} tenant(s) are actively subscribed. Deactivate the plan instead.`,
      );
    }

    await this.prisma.plan.update({
      where: { id: planId },
      data: { isActive: false },
    });

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: null,
      action: 'plan.deactivate',
      resourceType: 'plan',
      resourceId: planId,
      metadata: { name: plan.name },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { id: planId, isActive: false };
  }

  async reactivatePlan(planId: string, ctx: AuditContext) {
    const plan = await this.findPlanOrThrow(planId);

    if (plan.isActive) {
      throw new BadRequestException(`Plan "${plan.name}" is already active`);
    }

    await this.prisma.plan.update({
      where: { id: planId },
      data: { isActive: true },
    });

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: null,
      action: 'plan.reactivate',
      resourceType: 'plan',
      resourceId: planId,
      metadata: { name: plan.name },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { id: planId, isActive: true };
  }

  async assignPlanToTenant(dto: AssignPlanDto, ctx: AuditContext) {
    const [tenant, plan] = await Promise.all([
      this.prisma.tenant.findFirst({
        where: { id: dto.tenantId, deletedAt: null },
      }),
      this.findPlanOrThrow(dto.planId),
    ]);

    if (!tenant) {
      throw new NotFoundException(`Tenant "${dto.tenantId}" not found`);
    }

    const existingSub = await this.prisma.subscription.findFirst({
      where: {
        tenantId: dto.tenantId,
        status: { in: ['active', 'trialing', 'past_due'] },
      },
    });

    const renewalDate = new Date();
    renewalDate.setMonth(
      renewalDate.getMonth() + (plan.billingCycle === 'yearly' ? 12 : 1),
    );

    let subscription;
    if (existingSub) {
      subscription = await this.prisma.subscription.update({
        where: { id: existingSub.id },
        data: { planId: dto.planId, renewalDate },
      });
    } else {
      subscription = await this.prisma.subscription.create({
        data: {
          tenantId: dto.tenantId,
          planId: dto.planId,
          status: 'active',
          renewalDate,
        },
      });
    }

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: dto.tenantId,
      action: 'plan.assign_to_tenant',
      resourceType: 'subscription',
      resourceId: subscription.id,
      metadata: { planName: plan.name, tenantName: tenant.name },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return subscription;
  }

  private async findPlanOrThrow(planId: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: { limits: true, widgets: true },
    });
    if (!plan) {
      throw new NotFoundException(`Plan "${planId}" not found`);
    }
    return plan;
  }
}
