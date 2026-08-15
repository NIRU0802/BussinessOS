import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { QrSessionService } from './qr/qr-session.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { MergeTablesDto } from './dto/merge-tables.dto';

@Injectable()
export class TablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
    private readonly qrSessionService: QrSessionService,
  ) {}

  async create(branchId: string, dto: CreateTableDto) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    const existing = await this.prisma.forTenant(tenantId, (tx) =>
      tx.table.findFirst({
        where: { branchId, label: dto.label, deletedAt: null },
      }),
    );
    if (existing) {
      throw new ConflictException(
        `A table labeled "${dto.label}" already exists at this branch.`,
      );
    }

    const table = await this.prisma.forTenant(tenantId, (tx) =>
      tx.table.create({
        data: {
          tenantId,
          branchId,
          label: dto.label,
          capacity: dto.capacity ?? 2,
        },
      }),
    );

    await this.auditLog.log({
      tenantId,
      userId,
      branchId,
      action: 'tables.create',
      entityType: 'Table',
      entityId: table.id,
    });

    return table;
  }

  async listForBranch(branchId: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.table.findMany({
        where: { branchId, deletedAt: null },
        orderBy: { label: 'asc' },
      }),
    );
  }

  async findOne(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const table = await this.prisma.forTenant(tenantId, (tx) =>
      tx.table.findFirst({ where: { id, deletedAt: null } }),
    );
    if (!table) throw new NotFoundException('Table not found');
    return table;
  }

  async update(id: string, dto: UpdateTableDto) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    const table = await this.findOne(id);

    const updated = await this.prisma.forTenant(tenantId, (tx) =>
      tx.table.update({ where: { id }, data: dto }),
    );

    await this.auditLog.log({
      tenantId,
      userId,
      branchId: table.branchId,
      action: 'tables.update',
      entityType: 'Table',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });

    return updated;
  }

  async softDelete(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    const table = await this.findOne(id);

    await this.prisma.forTenant(tenantId, (tx) =>
      tx.table.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      }),
    );

    await this.auditLog.log({
      tenantId,
      userId,
      branchId: table.branchId,
      action: 'tables.delete',
      entityType: 'Table',
      entityId: id,
    });

    return { success: true };
  }

  // -----------------------------------------------------------------
  // QR provisioning
  // -----------------------------------------------------------------

  async getCurrentQrToken(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const table = await this.findOne(id);
    const { token, rotatedAt } = await this.qrSessionService.issueToken(
      tenantId,
      table.branchId,
      table.id,
      false,
    );
    return { token, rotatedAt };
  }

  async rotateQrToken(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    const table = await this.findOne(id);

    const { token, rotatedAt } = await this.qrSessionService.issueToken(
      tenantId,
      table.branchId,
      table.id,
      true,
    );

    await this.auditLog.log({
      tenantId,
      userId,
      branchId: table.branchId,
      action: 'tables.qr_rotate',
      entityType: 'Table',
      entityId: id,
    });

    return { token, rotatedAt };
  }

  // -----------------------------------------------------------------
  // Merge / split
  // -----------------------------------------------------------------

  async mergeTables(branchId: string, dto: MergeTablesDto) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    if (dto.tableIdsToMerge.includes(dto.primaryTableId)) {
      throw new BadRequestException(
        'primaryTableId must not appear in tableIdsToMerge.',
      );
    }

    const allIds = [dto.primaryTableId, ...dto.tableIdsToMerge];
    const tables = await this.prisma.forTenant(tenantId, (tx) =>
      tx.table.findMany({
        where: { id: { in: allIds }, branchId, deletedAt: null },
      }),
    );

    if (tables.length !== allIds.length) {
      throw new NotFoundException(
        'One or more tables were not found at this branch.',
      );
    }
    if (tables.some((t) => t.mergedIntoTableId)) {
      throw new ConflictException(
        'One or more of these tables is already part of a merge. Split first.',
      );
    }

    await this.prisma.forTenant(tenantId, (tx) =>
      tx.table.updateMany({
        where: { id: { in: dto.tableIdsToMerge } },
        data: { mergedIntoTableId: dto.primaryTableId },
      }),
    );

    await this.auditLog.log({
      tenantId,
      userId,
      branchId,
      action: 'tables.merge',
      entityType: 'Table',
      entityId: dto.primaryTableId,
      metadata: { mergedTableIds: dto.tableIdsToMerge },
    });

    return this.findOne(dto.primaryTableId);
  }

  async splitTable(primaryTableId: string) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    const primary = await this.findOne(primaryTableId);

    const mergedTables = await this.prisma.forTenant(tenantId, (tx) =>
      tx.table.findMany({
        where: { mergedIntoTableId: primaryTableId, deletedAt: null },
      }),
    );

    await this.prisma.forTenant(tenantId, (tx) =>
      tx.table.updateMany({
        where: { mergedIntoTableId: primaryTableId },
        data: { mergedIntoTableId: null },
      }),
    );

    await this.auditLog.log({
      tenantId,
      userId,
      branchId: primary.branchId,
      action: 'tables.split',
      entityType: 'Table',
      entityId: primaryTableId,
      metadata: { unmergedTableIds: mergedTables.map((t) => t.id) },
    });

    return { success: true, unmergedTableIds: mergedTables.map((t) => t.id) };
  }

  // -----------------------------------------------------------------
  // Dining sessions (read history — lifecycle is event-driven)
  // -----------------------------------------------------------------

  async listDiningSessions(tableId: string) {
    const tenantId = this.tenantContext.getTenantId();
    await this.findOne(tableId);
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.diningSession.findMany({
        where: { tableId },
        orderBy: { openedAt: 'desc' },
        take: 50,
      }),
    );
  }
}
