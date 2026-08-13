import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { AssignBranchDto } from './dto/assign-branch.dto';

@Injectable()
export class BranchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(dto: CreateBranchDto) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    const branch = await this.prisma.forTenant(tenantId, (tx) =>
      tx.branch.create({
        data: {
          tenantId,
          name: dto.name,
          address: dto.address,
          country: dto.country ?? 'IN',
          timezone: dto.timezone ?? 'Asia/Kolkata',
        },
      }),
    );

    await this.auditLog.log({
      tenantId,
      userId,
      branchId: branch.id,
      action: 'branch.create',
      entityType: 'Branch',
      entityId: branch.id,
    });

    return branch;
  }

  /**
   * Returns only branches the current user can access:
   * - all branches for Owners (isAllBranches)
   * - only explicitly assigned branches for everyone else
   */
  async listAccessible() {
    const tenantId = this.tenantContext.getTenantId();
    const isAllBranches = this.tenantContext.hasAllBranchAccess();
    const branchIds = this.tenantContext.getBranchIds();

    return this.prisma.forTenant(tenantId, (tx) =>
      tx.branch.findMany({
        where: {
          deletedAt: null,
          ...(isAllBranches ? {} : { id: { in: branchIds } }),
        },
        orderBy: { name: 'asc' },
      }),
    );
  }

  async findOne(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const branch = await this.prisma.forTenant(tenantId, (tx) =>
      tx.branch.findFirst({ where: { id, deletedAt: null } }),
    );
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async update(id: string, dto: UpdateBranchDto) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    await this.findOne(id);

    const updated = await this.prisma.forTenant(tenantId, (tx) =>
      tx.branch.update({ where: { id }, data: dto }),
    );

    await this.auditLog.log({
      tenantId,
      userId,
      branchId: id,
      action: 'branch.update',
      entityType: 'Branch',
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
      tx.branch.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      }),
    );

    await this.auditLog.log({
      tenantId,
      userId,
      branchId: id,
      action: 'branch.delete',
      entityType: 'Branch',
      entityId: id,
    });

    return { success: true };
  }

  async assignUserToBranch(dto: AssignBranchDto) {
    const tenantId = this.tenantContext.getTenantId();
    const actorId = this.tenantContext.getUserId();

    const assignment = await this.prisma.forTenant(tenantId, (tx) =>
      tx.userBranch.upsert({
        where: {
          userId_branchId: { userId: dto.userId, branchId: dto.branchId },
        },
        create: { tenantId, userId: dto.userId, branchId: dto.branchId },
        update: {},
      }),
    );

    await this.auditLog.log({
      tenantId,
      userId: actorId,
      branchId: dto.branchId,
      action: 'branch.assign_user',
      entityType: 'User',
      entityId: dto.userId,
    });

    return assignment;
  }

  async revokeUserFromBranch(userId: string, branchId: string) {
    const tenantId = this.tenantContext.getTenantId();
    const actorId = this.tenantContext.getUserId();

    await this.prisma.forTenant(tenantId, (tx) =>
      tx.userBranch.delete({
        where: { userId_branchId: { userId, branchId } },
      }),
    );

    await this.auditLog.log({
      tenantId,
      userId: actorId,
      branchId,
      action: 'branch.revoke_user',
      entityType: 'User',
      entityId: userId,
    });

    return { success: true };
  }
}
