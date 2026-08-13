import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantContextService } from '../../../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CreateModifierGroupDto } from '../dto/create-modifier-group.dto';
import { CreateModifierOptionDto } from '../dto/create-modifier-option.dto';

@Injectable()
export class ModifierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
  ) {}

  async createGroup(dto: CreateModifierGroupDto) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    const group = await this.prisma.forTenant(tenantId, (tx) =>
      tx.modifierGroup.create({
        data: {
          tenantId,
          name: dto.name,
          minSelect: dto.minSelect ?? 0,
          maxSelect: dto.maxSelect ?? 1,
          isRequired: dto.isRequired ?? false,
          options: {
            create: dto.options.map((o) => ({
              tenantId,
              name: o.name,
              priceDelta: o.priceDelta ?? 0,
            })),
          },
        },
        include: { options: true },
      }),
    );

    await this.auditLog.log({
      tenantId,
      userId,
      action: 'menu.modifier_group.create',
      entityType: 'ModifierGroup',
      entityId: group.id,
    });

    return group;
  }

  async listGroups() {
    const tenantId = this.tenantContext.getTenantId();
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.modifierGroup.findMany({
        include: { options: { where: { isActive: true } } },
        orderBy: { sortOrder: 'asc' },
      }),
    );
  }

  async findGroup(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const group = await this.prisma.forTenant(tenantId, (tx) =>
      tx.modifierGroup.findFirst({
        where: { id },
        include: { options: true },
      }),
    );
    if (!group) throw new NotFoundException('Modifier group not found');
    return group;
  }

  async addOption(groupId: string, dto: CreateModifierOptionDto) {
    const tenantId = this.tenantContext.getTenantId();
    await this.findGroup(groupId);

    return this.prisma.forTenant(tenantId, (tx) =>
      tx.modifierOption.create({
        data: {
          tenantId,
          modifierGroupId: groupId,
          name: dto.name,
          priceDelta: dto.priceDelta ?? 0,
        },
      }),
    );
  }

  async removeOption(optionId: string) {
    const tenantId = this.tenantContext.getTenantId();
    await this.prisma.forTenant(tenantId, (tx) =>
      tx.modifierOption.update({
        where: { id: optionId },
        data: { isActive: false },
      }),
    );
    return { success: true };
  }

  async deleteGroup(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    await this.findGroup(id);

    await this.prisma.forTenant(tenantId, (tx) =>
      tx.modifierGroup.delete({ where: { id } }),
    );

    await this.auditLog.log({
      tenantId,
      userId,
      action: 'menu.modifier_group.delete',
      entityType: 'ModifierGroup',
      entityId: id,
    });

    return { success: true };
  }
}
