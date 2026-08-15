import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantContextService } from '../../../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { SetBranchOverrideDto } from '../dto/set-branch-override.dto';
import { MENU_EVENTS, MenuItemUpdatedEvent } from '../events/menu.events';

@Injectable()
export class BranchOverrideService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
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
          availableDays: dto.availableDays ?? [],
          availableFromTime: dto.availableFromTime ?? null,
          availableToTime: dto.availableToTime ?? null,
        },
        update: {
          priceOverride:
            dto.priceOverride === undefined ? undefined : dto.priceOverride,
          isAvailable:
            dto.isAvailable === undefined ? undefined : dto.isAvailable,
          isHidden: dto.isHidden === undefined ? undefined : dto.isHidden,
          availableDays:
            dto.availableDays === undefined ? undefined : dto.availableDays,
          availableFromTime:
            dto.availableFromTime === undefined
              ? undefined
              : dto.availableFromTime,
          availableToTime:
            dto.availableToTime === undefined ? undefined : dto.availableToTime,
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

    // Emit menu.item_updated so downstream consumers (KDS, Reports, and
    // eventually Phase 12 Delivery Aggregator adapters) can react.
    // This does NOT cascade to other branches/channels — per-branch
    // availability stays branch-scoped; consumers decide what to do
    // (typically: notify the manager, never auto-sync).
    this.eventEmitter.emit(
      MENU_EVENTS.ITEM_UPDATED,
      new MenuItemUpdatedEvent(
        tenantId,
        dto.branchId,
        dto.menuItemId,
        override.isAvailable,
        override.isHidden,
        override.priceOverride ? override.priceOverride.toString() : null,
      ),
    );

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

    // Clearing an override resets the item back to the tenant-wide
    // default (available, not hidden, base price) at this branch.
    this.eventEmitter.emit(
      MENU_EVENTS.ITEM_UPDATED,
      new MenuItemUpdatedEvent(
        tenantId,
        branchId,
        menuItemId,
        true,
        false,
        null,
      ),
    );

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
