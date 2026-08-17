import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface UsageSnapshot {
  branchCount: number;
  userCount: number;
  deviceCount: number;
  monthlyOrderCount: number;
  limits: {
    maxBranches: number | null;
    maxUsers: number | null;
    maxDevices: number | null;
    maxStorageMb: number | null;
    maxMonthlyOrders: number | null;
  };
}

/**
 * Injectable, imported BY other modules to check plan limits before
 * allowing an action. Queries Prisma directly rather than through
 * BranchService/StaffService/OrdersService, because those services
 * pull tenantId from TenantContextService (AsyncLocalStorage), which
 * is only populated inside an HTTP request — this service must also
 * run from BullMQ jobs with an explicit tenantId and no request context.
 */
@Injectable()
export class UsageTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  private async getActivePlanLimits(tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId, status: { in: ['trialing', 'active', 'past_due'] } },
      include: { plan: { include: { limits: true } } },
      orderBy: { startedAt: 'desc' },
    });
    return subscription?.plan.limits ?? null;
  }

  async getUsageSnapshot(tenantId: string): Promise<UsageSnapshot> {
    const limits = await this.getActivePlanLimits(tenantId);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [branchCount, userCount, monthlyOrderCount] = await Promise.all([
      this.prisma.forTenant(tenantId, (tx) =>
        tx.branch.count({ where: { deletedAt: null } }),
      ),
      this.prisma.forTenant(tenantId, (tx) =>
        tx.user.count({ where: { deletedAt: null } }),
      ),
      this.prisma.forTenant(tenantId, (tx) =>
        tx.order.count({ where: { createdAt: { gte: startOfMonth } } }),
      ),
    ]);

    return {
      branchCount,
      userCount,
      // No device tracking table exists yet in the schema. Returning 0
      // (unrestricted) rather than guessing at a data source. Wire this
      // up once a device/session table exists (likely a Phase 12+ item).
      deviceCount: 0,
      monthlyOrderCount,
      limits: {
        maxBranches: limits?.maxBranches ?? null,
        maxUsers: limits?.maxUsers ?? null,
        maxDevices: limits?.maxDevices ?? null,
        maxStorageMb: limits?.maxStorageMb ?? null,
        maxMonthlyOrders: limits?.maxMonthlyOrders ?? null,
      },
    };
  }

  async canAddBranch(tenantId: string): Promise<boolean> {
    const limits = await this.getActivePlanLimits(tenantId);
    if (!limits?.maxBranches) return true;
    const count = await this.prisma.forTenant(tenantId, (tx) =>
      tx.branch.count({ where: { deletedAt: null } }),
    );
    return count < limits.maxBranches;
  }

  async canAddUser(tenantId: string): Promise<boolean> {
    const limits = await this.getActivePlanLimits(tenantId);
    if (!limits?.maxUsers) return true;
    const count = await this.prisma.forTenant(tenantId, (tx) =>
      tx.user.count({ where: { deletedAt: null } }),
    );
    return count < limits.maxUsers;
  }

  /** No device table exists yet — always unrestricted until one is built. */
  async canAddDevice(_tenantId: string): Promise<boolean> {
    return true;
  }

  async canPlaceOrder(tenantId: string): Promise<boolean> {
    const limits = await this.getActivePlanLimits(tenantId);
    if (!limits?.maxMonthlyOrders) return true;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const count = await this.prisma.forTenant(tenantId, (tx) =>
      tx.order.count({ where: { createdAt: { gte: startOfMonth } } }),
    );
    return count < limits.maxMonthlyOrders;
  }

  async tenantHasWidget(tenantId: string, widgetKey: string): Promise<boolean> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId, status: { in: ['trialing', 'active', 'past_due'] } },
      include: { plan: { include: { widgets: true } } },
      orderBy: { startedAt: 'desc' },
    });
    if (!subscription) return false;
    return subscription.plan.widgets.some((w) => w.widgetKey === widgetKey);
  }
}
