import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantContextService } from '../../../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { SetBranchOverrideDto } from '../dto/set-branch-override.dto';

@Injectable()
export class BranchOverrideService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * Creates or updates the override row for a (branch, menuItem) pair.
   * Passing priceOverride: null clears any price override (falls back to
   * MenuItem.basePrice). isAvailable/isHidden default to sensible values
   * (available, not hidden) if this is the first override for the pair.
   */
  async setOverride(dto: SetBranchOverrideDto) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    const menuItem = await this.prisma.forTenant(tenantId, (tx) =>
      tx.menuItem.findFirst({ where: { id: dto.menuItemId, deletedAt: null } }),
    );
    if (!menuItem) throw new NotFoundException('Menu item not found');

    const branch = await this.prisma.forTenant(tenantId, (tx) =>
      tx.branch.findFirst({ where: { id: dto.branchId, deletedAt: null } }),
    );
    if (!branch) throw new NotFoundException('Branch not found');

    const override = await this.prisma.forTenant(tenantId, (tx) =>
      tx.branchMenuItemOverride.upsert({
        where: {
          branchId_menuItemId: {
            branchId: dto.branchId,
            menuItemId: dto.menuItemId,
          },
        },
        create: {
          tenantId,
          branchId: dto.branchId,
          menuItemId: dto.menuItemId,
          priceOverride: dto.priceOverride ?? null,
          isAvailable: dto.isAvailable ?? true,
          isHidden: dto.isHidden ?? false,
        },
        update: {
          priceOverride:
            dto.priceOverride === undefined ? undefined : dto.priceOverride,
          isAvailable:
            dto.isAvailable === undefined ? undefined : dto.isAvailable,
          isHidden: dto.isHidden === undefined ? undefined : dto.isHidden,
        },
      }),
    );

    await this.auditLog.log({
      tenantId,
      userId,
      branchId: dto.branchId,
      action: 'menu.branch_override.set',
      entityType: 'MenuItem',
      entityId: dto.menuItemId,
      metadata: dto as unknown as Record<string, unknown>,
    });

    return override;
  }

  async clearOverride(branchId: string, menuItemId: string) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    await this.prisma.forTenant(tenantId, (tx) =>
      tx.branchMenuItemOverride.delete({
        where: { branchId_menuItemId: { branchId, menuItemId } },
      }),
    );

    await this.auditLog.log({
      tenantId,
      userId,
      branchId,
      action: 'menu.branch_override.clear',
      entityType: 'MenuItem',
      entityId: menuItemId,
    });

    return { success: true };
  }

  async listForBranch(branchId: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.branchMenuItemOverride.findMany({
        where: { branchId },
        include: {
          menuItem: { select: { id: true, name: true, basePrice: true } },
        },
      }),
    );
  }
}
