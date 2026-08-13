import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantContextService } from '../../../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(dto: CreateCategoryDto) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    const category = await this.prisma.forTenant(tenantId, (tx) =>
      tx.menuCategory.create({
        data: {
          tenantId,
          name: dto.name,
          description: dto.description,
          sortOrder: dto.sortOrder ?? 0,
        },
      }),
    );

    await this.auditLog.log({
      tenantId,
      userId,
      action: 'menu.category.create',
      entityType: 'MenuCategory',
      entityId: category.id,
    });

    return category;
  }

  async list() {
    const tenantId = this.tenantContext.getTenantId();
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.menuCategory.findMany({
        where: { deletedAt: null },
        orderBy: { sortOrder: 'asc' },
      }),
    );
  }

  async findOne(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const category = await this.prisma.forTenant(tenantId, (tx) =>
      tx.menuCategory.findFirst({ where: { id, deletedAt: null } }),
    );
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    await this.findOne(id);

    const updated = await this.prisma.forTenant(tenantId, (tx) =>
      tx.menuCategory.update({ where: { id }, data: dto }),
    );

    await this.auditLog.log({
      tenantId,
      userId,
      action: 'menu.category.update',
      entityType: 'MenuCategory',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });

    return updated;
  }

  async softDelete(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    await this.findOne(id);

    await this.prisma.forTenant(tenantId, (tx) =>
      tx.menuCategory.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      }),
    );

    await this.auditLog.log({
      tenantId,
      userId,
      action: 'menu.category.delete',
      entityType: 'MenuCategory',
      entityId: id,
    });

    return { success: true };
  }
}
