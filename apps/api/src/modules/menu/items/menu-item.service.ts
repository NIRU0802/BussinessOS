import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantContextService } from '../../../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CreateMenuItemDto } from '../dto/create-menu-item.dto';
import { UpdateMenuItemDto } from '../dto/update-menu-item.dto';

@Injectable()
export class MenuItemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(dto: CreateMenuItemDto) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    const item = await this.prisma.forTenant(tenantId, async (tx) => {
      const category = await tx.menuCategory.findFirst({
        where: { id: dto.categoryId, deletedAt: null },
      });
      if (!category) throw new NotFoundException('Category not found');

      if (dto.taxClassId) {
        const taxClass = await tx.taxClass.findFirst({
          where: { id: dto.taxClassId },
        });
        if (!taxClass) throw new NotFoundException('Tax class not found');
      }

      const created = await tx.menuItem.create({
        data: {
          tenantId,
          categoryId: dto.categoryId,
          name: dto.name,
          description: dto.description,
          basePrice: dto.basePrice,
          isVegetarian: dto.isVegetarian ?? false,
          sortOrder: dto.sortOrder ?? 0,
          taxClassId: dto.taxClassId,
          availableDays: dto.availableDays ?? [],
          availableFromTime: dto.availableFromTime,
          availableToTime: dto.availableToTime,
          variants: dto.variants?.length
            ? {
                create: dto.variants.map((v) => ({
                  tenantId,
                  name: v.name,
                  priceDelta: v.priceDelta,
                  isDefault: v.isDefault ?? false,
                })),
              }
            : undefined,
          modifierGroups: dto.modifierGroupIds?.length
            ? {
                create: dto.modifierGroupIds.map((groupId) => ({
                  tenantId,
                  modifierGroupId: groupId,
                })),
              }
            : undefined,
        },
        include: {
          variants: true,
          modifierGroups: { include: { modifierGroup: true } },
        },
      });

      return created;
    });

    await this.auditLog.log({
      tenantId,
      userId,
      action: 'menu.item.create',
      entityType: 'MenuItem',
      entityId: item.id,
    });

    return item;
  }

  async list(categoryId?: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.menuItem.findMany({
        where: { deletedAt: null, ...(categoryId ? { categoryId } : {}) },
        include: {
          variants: { where: { isActive: true } },
          modifierGroups: {
            include: { modifierGroup: { include: { options: true } } },
          },
        },
        orderBy: { sortOrder: 'asc' },
      }),
    );
  }

  async findOne(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const item = await this.prisma.forTenant(tenantId, (tx) =>
      tx.menuItem.findFirst({
        where: { id, deletedAt: null },
        include: {
          variants: true,
          modifierGroups: {
            include: { modifierGroup: { include: { options: true } } },
          },
        },
      }),
    );
    if (!item) throw new NotFoundException('Menu item not found');
    return item;
  }

  async update(id: string, dto: UpdateMenuItemDto) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    await this.findOne(id);

    const { variants, modifierGroupIds, ...scalarFields } = dto;

    const updated = await this.prisma.forTenant(tenantId, (tx) =>
      tx.menuItem.update({ where: { id }, data: scalarFields }),
    );

    await this.auditLog.log({
      tenantId,
      userId,
      action: 'menu.item.update',
      entityType: 'MenuItem',
      entityId: id,
      metadata: scalarFields as Record<string, unknown>,
    });

    return updated;
  }

  async setImageKey(id: string, imageKey: string) {
    const tenantId = this.tenantContext.getTenantId();
    await this.findOne(id);
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.menuItem.update({ where: { id }, data: { imageKey } }),
    );
  }

  async softDelete(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    await this.findOne(id);

    await this.prisma.forTenant(tenantId, (tx) =>
      tx.menuItem.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      }),
    );

    await this.auditLog.log({
      tenantId,
      userId,
      action: 'menu.item.delete',
      entityType: 'MenuItem',
      entityId: id,
    });

    return { success: true };
  }

  async attachModifierGroup(menuItemId: string, modifierGroupId: string) {
    const tenantId = this.tenantContext.getTenantId();
    await this.findOne(menuItemId);

    return this.prisma.forTenant(tenantId, (tx) =>
      tx.menuItemModifierGroup.upsert({
        where: { menuItemId_modifierGroupId: { menuItemId, modifierGroupId } },
        create: { tenantId, menuItemId, modifierGroupId },
        update: {},
      }),
    );
  }

  async detachModifierGroup(menuItemId: string, modifierGroupId: string) {
    const tenantId = this.tenantContext.getTenantId();
    await this.prisma.forTenant(tenantId, (tx) =>
      tx.menuItemModifierGroup.delete({
        where: { menuItemId_modifierGroupId: { menuItemId, modifierGroupId } },
      }),
    );
    return { success: true };
  }
}
