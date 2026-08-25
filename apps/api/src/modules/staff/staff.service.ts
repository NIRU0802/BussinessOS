import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { UpdateStaffUserDto } from './dto/update-staff-user.dto';
import { ChangeOwnPasswordDto } from './dto/change-own-password.dto';
import { UnauthorizedException } from '@nestjs/common';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * Creates a new staff/user account within the current tenant and
   * assigns exactly one role at creation time. Additional roles can be
   * granted later via RbacService.assignRoleToUser().
   */
  async createStaffUser(dto: CreateStaffUserDto) {
    const tenantId = this.tenantContext.getTenantId();
    const actorId = this.tenantContext.getUserId();

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.forTenant(tenantId, async (tx) => {
      const existing = await tx.user.findFirst({
        where: { email: dto.email.toLowerCase() },
      });
      if (existing) {
        throw new ConflictException(
          'A user with this email already exists in this tenant.',
        );
      }

      const role = await tx.role.findFirst({ where: { id: dto.roleId } });
      if (!role) {
        throw new NotFoundException('Role not found');
      }

      if (dto.branchIds?.length) {
        const branchCount = await tx.branch.count({
          where: { id: { in: dto.branchIds }, deletedAt: null },
        });
        if (branchCount !== dto.branchIds.length) {
          throw new NotFoundException('One or more branch IDs are invalid');
        }
      }

      return tx.user.create({
        data: {
          tenantId,
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          isAllBranches: dto.isAllBranches ?? false,
          roles: { create: [{ tenantId, roleId: dto.roleId }] },
          branches: dto.branchIds?.length
            ? {
                create: dto.branchIds.map((branchId) => ({
                  tenantId,
                  branchId,
                })),
              }
            : undefined,
        },
        include: {
          roles: { include: { role: true } },
          branches: { include: { branch: true } },
        },
      });
    });

    await this.auditLog.log({
      tenantId,
      userId: actorId,
      action: 'staff.create',
      entityType: 'User',
      entityId: user.id,
      metadata: { email: user.email, roleId: dto.roleId },
    });

    // Never return the password hash.
    const { passwordHash: _omit, ...safeUser } = user;
    return safeUser;
  }

  async list() {
    const tenantId = this.tenantContext.getTenantId();
    const users = await this.prisma.forTenant(tenantId, (tx) =>
      tx.user.findMany({
        where: { deletedAt: null },
        include: {
          roles: { include: { role: true } },
          branches: { include: { branch: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    );
    return users.map(({ passwordHash: _omit, ...u }) => u);
  }

  async findOne(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const user = await this.prisma.forTenant(tenantId, (tx) =>
      tx.user.findFirst({
        where: { id, deletedAt: null },
        include: {
          roles: { include: { role: true } },
          branches: { include: { branch: true } },
        },
      }),
    );
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash: _omit, ...safeUser } = user;
    return safeUser;
  }

  async deactivate(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const actorId = this.tenantContext.getUserId();

    await this.findOne(id);

    await this.prisma.forTenant(tenantId, (tx) =>
      tx.user.update({ where: { id }, data: { isActive: false } }),
    );

    await this.auditLog.log({
      tenantId,
      userId: actorId,
      action: 'staff.deactivate',
      entityType: 'User',
      entityId: id,
    });

    return { success: true };
  }

  async reactivate(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const actorId = this.tenantContext.getUserId();

    await this.findOne(id);

    await this.prisma.forTenant(tenantId, (tx) =>
      tx.user.update({ where: { id }, data: { isActive: true } }),
    );

    await this.auditLog.log({
      tenantId,
      userId: actorId,
      action: 'staff.reactivate',
      entityType: 'User',
      entityId: id,
    });

    return { success: true };
  }

  async update(id: string, dto: UpdateStaffUserDto) {
    const tenantId = this.tenantContext.getTenantId();
    const actorId = this.tenantContext.getUserId();

    await this.findOne(id);

    if (dto.roleId) {
      const role = await this.prisma.forTenant(tenantId, (tx) =>
        tx.role.findFirst({ where: { id: dto.roleId } }),
      );
      if (!role) throw new NotFoundException('Role not found');
    }

    if (dto.branchIds?.length) {
      const branchCount = await this.prisma.forTenant(tenantId, (tx) =>
        tx.branch.count({
          where: { id: { in: dto.branchIds }, deletedAt: null },
        }),
      );
      if (branchCount !== dto.branchIds.length) {
        throw new NotFoundException('One or more branch IDs are invalid');
      }
    }

    const updated = await this.prisma.forTenant(tenantId, async (tx) => {
      if (dto.branchIds) {
        await tx.userBranch.deleteMany({ where: { userId: id } });
      }

      return tx.user.update({
        where: { id },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          isAllBranches: dto.isAllBranches,
          roles: dto.roleId
            ? {
                deleteMany: {},
                create: [{ tenantId, roleId: dto.roleId }],
              }
            : undefined,
          branches: dto.branchIds?.length
            ? {
                create: dto.branchIds.map((branchId) => ({
                  tenantId,
                  branchId,
                })),
              }
            : undefined,
        },
        include: {
          roles: { include: { role: true } },
          branches: { include: { branch: true } },
        },
      });
    });

    await this.auditLog.log({
      tenantId,
      userId: actorId,
      action: 'staff.update',
      entityType: 'User',
      entityId: id,
    });

    const { passwordHash: _omit, ...safeUser } = updated;
    return safeUser;
  }

  async changeOwnPassword(dto: ChangeOwnPasswordDto) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    const user = await this.prisma.forTenant(tenantId, (tx) =>
      tx.user.findFirst({ where: { id: userId, deletedAt: null } }),
    );
    if (!user) throw new NotFoundException('User not found');

    const currentValid = await argon2.verify(
      user.passwordHash,
      dto.currentPassword,
    );
    if (!currentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newHash = await argon2.hash(dto.newPassword);

    await this.prisma.forTenant(tenantId, (tx) =>
      tx.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      }),
    );

    await this.auditLog.log({
      tenantId,
      userId,
      action: 'staff.change_own_password',
      entityType: 'User',
      entityId: userId,
    });

    return { success: true };
  }
}
