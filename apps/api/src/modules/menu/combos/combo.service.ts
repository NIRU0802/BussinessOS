import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantContextService } from '../../../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { MinioService } from '../../../common/storage/minio.service';
import { CreateComboDto } from '../dto/create-combo.dto';
import { UpdateComboDto } from '../dto/update-combo.dto';

@Injectable()
export class ComboService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
    private readonly minio: MinioService,
  ) {}

  async create(dto: CreateComboDto) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    const combo = await this.prisma.forTenant(tenantId, async (tx) => {
      const menuItemIds = dto.items.map((i) => i.menuItemId);
      const foundItems = await tx.menuItem.findMany({
        where: { id: { in: menuItemIds }, deletedAt: null },
      });
      if (foundItems.length !== new Set(menuItemIds).size) {
        throw new NotFoundException('One or more menu items not found');
      }

      return tx.combo.create({
        data: {
          tenantId,
          name: dto.name,
          description: dto.description,
          comboPrice: dto.comboPrice,
          items: {
            create: dto.items.map((i) => ({
              tenantId,
              menuItemId: i.menuItemId,
              quantity: i.quantity,
            })),
          },
        },
        include: { items: { include: { menuItem: true } } },
      });
    });

    await this.auditLog.log({
      tenantId,
      userId,
      action: 'menu.combo.create',
      entityType: 'Combo',
      entityId: combo.id,
    });

    return this.attachSuggestedPrice(combo);
  }

  async list() {
    const tenantId = this.tenantContext.getTenantId();
    const combos = await this.prisma.forTenant(tenantId, (tx) =>
      tx.combo.findMany({
        where: { deletedAt: null },
        include: { items: { include: { menuItem: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    );
    return Promise.all(combos.map((c) => this.attachSuggestedPrice(c)));
  }

  async findOne(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const combo = await this.prisma.forTenant(tenantId, (tx) =>
      tx.combo.findFirst({
        where: { id, deletedAt: null },
        include: { items: { include: { menuItem: true } } },
      }),
    );
    if (!combo) throw new NotFoundException('Combo not found');
    return this.attachSuggestedPrice(combo);
  }

  async update(id: string, dto: UpdateComboDto) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    await this.findOne(id);

    const { items, ...scalarFields } = dto;

    const updated = await this.prisma.forTenant(tenantId, async (tx) => {
      if (items?.length) {
        const menuItemIds = items.map((i) => i.menuItemId);
        const foundItems = await tx.menuItem.findMany({
          where: { id: { in: menuItemIds }, deletedAt: null },
        });
        if (foundItems.length !== new Set(menuItemIds).size) {
          throw new NotFoundException('One or more menu items not found');
        }

        await tx.comboItem.deleteMany({ where: { comboId: id } });
        await tx.comboItem.createMany({
          data: items.map((i) => ({
            tenantId,
            comboId: id,
            menuItemId: i.menuItemId,
            quantity: i.quantity,
          })),
        });
      }

      return tx.combo.update({
        where: { id },
        data: scalarFields,
        include: { items: { include: { menuItem: true } } },
      });
    });

    await this.auditLog.log({
      tenantId,
      userId,
      action: 'menu.combo.update',
      entityType: 'Combo',
      entityId: id,
      metadata: scalarFields as Record<string, unknown>,
    });

    return this.attachSuggestedPrice(updated);
  }

  async setImageKey(id: string, imageKey: string) {
    const tenantId = this.tenantContext.getTenantId();
    await this.findOne(id);
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.combo.update({ where: { id }, data: { imageKey } }),
    );
  }

  async softDelete(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    await this.findOne(id);

    await this.prisma.forTenant(tenantId, (tx) =>
      tx.combo.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      }),
    );

    await this.auditLog.log({
      tenantId,
      userId,
      action: 'menu.combo.delete',
      entityType: 'Combo',
      entityId: id,
    });

    return { success: true };
  }

  /**
   * Adds a read-only "suggestedPrice" (sum of included items' base prices
   * × quantity) as a helper for the frontend. comboPrice remains the
   * manually-set value actually charged — suggestedPrice is never applied
   * automatically.
   */
  private async attachSuggestedPrice(combo: any) {
    const suggestedPrice = combo.items.reduce(
      (sum: number, ci: any) =>
        sum + Number(ci.menuItem.basePrice) * ci.quantity,
      0,
    );

    const imageUrl = await this.minio.getSignedReadUrl(combo.imageKey);

    return { ...combo, suggestedPrice, imageUrl };
  }
}
