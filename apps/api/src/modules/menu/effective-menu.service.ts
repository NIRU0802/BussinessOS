import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context/tenant-context.service';
import { MinioService } from '../../common/storage/minio.service';

export interface EffectiveMenuItem {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  effectivePrice: number;
  isAvailable: boolean;
  isVegetarian: boolean;
  imageUrl: string | null;
  variants: {
    id: string;
    name: string;
    priceDelta: number;
    isDefault: boolean;
  }[];
  modifierGroups: {
    id: string;
    name: string;
    minSelect: number;
    maxSelect: number;
    isRequired: boolean;
    options: { id: string; name: string; priceDelta: number }[];
  }[];
}

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * Resolves the "as seen by branch X" menu: applies each
 * BranchMenuItemOverride on top of the tenant's base MenuItem data.
 * This is the single source of truth every branch-facing surface (POS,
 * QR ordering, KDS prep view, customer app) should call — nobody should
 * query MenuItem directly and reimplement override logic themselves.
 */
@Injectable()
export class EffectiveMenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly minio: MinioService,
  ) {}

  async getForBranch(branchId: string): Promise<EffectiveMenuItem[]> {
    const tenantId = this.tenantContext.getTenantId();

    const branch = await this.prisma.forTenant(tenantId, (tx) =>
      tx.branch.findFirst({ where: { id: branchId, deletedAt: null } }),
    );
    if (!branch) throw new NotFoundException('Branch not found');

    const items = await this.prisma.forTenant(tenantId, (tx) =>
      tx.menuItem.findMany({
        where: { deletedAt: null, isActive: true },
        include: {
          category: true,
          variants: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
          modifierGroups: {
            include: {
              modifierGroup: {
                include: { options: { where: { isActive: true } } },
              },
            },
          },
          branchOverrides: { where: { branchId } },
        },
        orderBy: { sortOrder: 'asc' },
      }),
    );

    const now = new Date();
    const results: EffectiveMenuItem[] = [];

    for (const item of items) {
      const override = item.branchOverrides[0]; // unique per (branch, item)

      // Hidden at this branch entirely — exclude from the resolved menu.
      if (override?.isHidden) continue;

      const effectivePrice = override?.priceOverride
        ? Number(override.priceOverride)
        : Number(item.basePrice);

      // Branch override's explicit isAvailable flag (manual out-of-stock toggle).
      const manuallyAvailable = override ? override.isAvailable : true;

      // Day/time window: branch override wins if it defines one, else fall
      // back to the master item's window. Empty availableDays / null times
      // means "no restriction" at that level.
      const effectiveDays =
        override && override.availableDays.length > 0
          ? override.availableDays
          : item.availableDays;
      const effectiveFromTime =
        override?.availableFromTime ?? item.availableFromTime;
      const effectiveToTime = override?.availableToTime ?? item.availableToTime;

      const withinWindow = this.isWithinAvailabilityWindow(
        now,
        effectiveDays,
        effectiveFromTime,
        effectiveToTime,
      );

      const isAvailable = manuallyAvailable && withinWindow;

      results.push({
        id: item.id,
        name: item.name,
        description: item.description,
        categoryId: item.categoryId,
        categoryName: item.category.name,
        effectivePrice,
        isAvailable,
        isVegetarian: item.isVegetarian,
        imageUrl: await this.minio.getSignedReadUrl(item.imageKey),
        variants: item.variants.map((v) => ({
          id: v.id,
          name: v.name,
          priceDelta: Number(v.priceDelta),
          isDefault: v.isDefault,
        })),
        modifierGroups: item.modifierGroups.map((mig) => ({
          id: mig.modifierGroup.id,
          name: mig.modifierGroup.name,
          minSelect: mig.modifierGroup.minSelect,
          maxSelect: mig.modifierGroup.maxSelect,
          isRequired: mig.modifierGroup.isRequired,
          options: mig.modifierGroup.options.map((o) => ({
            id: o.id,
            name: o.name,
            priceDelta: Number(o.priceDelta),
          })),
        })),
      });
    }

    return results;
  }

  /**
   * Checks whether `now` falls within the given day/time window.
   * - Empty `days` array = every day is allowed.
   * - Null `fromTime`/`toTime` = no time-of-day restriction.
   * - Times are evaluated in the SERVER's local time. Per-branch timezone
   *   awareness is handled by the Timezone Engine (Phase 2) and is out of
   *   scope for this resolver — branches should store times already
   *   adjusted for their own local business hours.
   */
  private isWithinAvailabilityWindow(
    now: Date,
    days: string[],
    fromTime: string | null,
    toTime: string | null,
  ): boolean {
    if (days.length > 0) {
      const todayKey = WEEKDAY_KEYS[now.getDay()];
      if (!days.includes(todayKey)) return false;
    }

    if (fromTime && toTime) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const [fromH, fromM] = fromTime.split(':').map(Number);
      const [toH, toM] = toTime.split(':').map(Number);
      const fromMinutes = fromH * 60 + fromM;
      const toMinutes = toH * 60 + toM;

      if (fromMinutes <= toMinutes) {
        // Normal same-day window, e.g. 09:00–22:00
        if (nowMinutes < fromMinutes || nowMinutes > toMinutes) return false;
      } else {
        // Overnight window, e.g. 20:00–02:00
        if (nowMinutes < fromMinutes && nowMinutes > toMinutes) return false;
      }
    }

    return true;
  }
}
