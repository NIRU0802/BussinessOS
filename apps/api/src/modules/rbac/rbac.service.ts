import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context/tenant-context.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

/**
 * Default permission catalog seeded per RoleName. Fine-grained permission
 * keys follow the pattern "<module>.<action>", e.g. "orders.void".
 * This map is the source of truth used at role-creation / tenant-provisioning
 * time; individual tenants can still customize permissions per role via
 * updateRolePermissions().
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: ['*'], // wildcard - all permissions, resolved specially in guards/seeding
  MANAGER: [
    'orders.read',
    'orders.write',
    'orders.void',
    'menu.read',
    'menu.write',
    'reports.read',
    'staff.read',
    'staff.write',
    'branches.read',
    'crm.read',
    'crm.write',
  ],
  CASHIER: ['orders.read', 'orders.write', 'menu.read'],
  CHEF: ['orders.read', 'kds.read', 'kds.write', 'menu.read'],
  KITCHEN_STAFF: ['orders.read', 'kds.read', 'kds.write'],
  WAREHOUSE: ['inventory.read', 'inventory.write'],
  ACCOUNTANT: ['reports.read', 'payments.read'],
  DELIVERY_RIDER: ['orders.read', 'delivery.read', 'delivery.write'],
  CUSTOMER: ['orders.read.own', 'qr.order'],
};

@Injectable()
export class RbacService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
  ) {}

  async createRole(dto: CreateRoleDto) {
    const tenantId = this.tenantContext.getTenantId();

    return this.prisma.forTenant(tenantId, async (tx) => {
      const permissions = await tx.permission.findMany({
        where: { key: { in: dto.permissionKeys } },
      });

      const role = await tx.role.create({
        data: {
          tenantId,
          name: dto.name as any,
          description: dto.description,
          isSystem: false,
          permissions: {
            create: permissions.map((p) => ({ permissionId: p.id })),
          },
        },
        include: { permissions: { include: { permission: true } } },
      });

      await this.auditLog.log({
        tenantId,
        action: 'role.create',
        entityType: 'Role',
        entityId: role.id,
        metadata: { name: role.name },
      });

      return role;
    });
  }

  async listRoles() {
    const tenantId = this.tenantContext.getTenantId();
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.role.findMany({
        include: { permissions: { include: { permission: true } } },
      }),
    );
  }

  async assignRoleToUser(dto: AssignRoleDto) {
    const tenantId = this.tenantContext.getTenantId();

    return this.prisma.forTenant(tenantId, async (tx) => {
      const [user, role] = await Promise.all([
        tx.user.findFirst({ where: { id: dto.userId } }),
        tx.role.findFirst({ where: { id: dto.roleId } }),
      ]);

      if (!user) throw new NotFoundException('User not found');
      if (!role) throw new NotFoundException('Role not found');

      const assignment = await tx.userRole.upsert({
        where: { userId_roleId: { userId: dto.userId, roleId: dto.roleId } },
        create: { tenantId, userId: dto.userId, roleId: dto.roleId },
        update: {},
      });

      await this.auditLog.log({
        tenantId,
        userId: dto.userId,
        action: 'role.assign',
        entityType: 'User',
        entityId: dto.userId,
        metadata: { roleId: dto.roleId, roleName: role.name },
      });

      return assignment;
    });
  }

  async revokeRoleFromUser(userId: string, roleId: string) {
    const tenantId = this.tenantContext.getTenantId();

    return this.prisma.forTenant(tenantId, async (tx) => {
      await tx.userRole.delete({
        where: { userId_roleId: { userId, roleId } },
      });

      await this.auditLog.log({
        tenantId,
        userId,
        action: 'role.revoke',
        entityType: 'User',
        entityId: userId,
        metadata: { roleId },
      });

      return { success: true };
    });
  }

  /**
   * Resolves the effective flat permission key list for a user, expanding
   * the OWNER wildcard against the full permission catalog.
   */
  async getEffectivePermissions(
    userId: string,
    tenantId: string,
  ): Promise<string[]> {
    return this.prisma.forTenant(tenantId, async (tx) => {
      const userRoles = await tx.userRole.findMany({
        where: { userId },
        include: {
          role: {
            include: { permissions: { include: { permission: true } } },
          },
        },
      });

      const isOwner = userRoles.some((ur) => ur.role.name === 'OWNER');
      if (isOwner) {
        const all = await tx.permission.findMany({ select: { key: true } });
        return all.map((p) => p.key);
      }

      const keys = new Set<string>();
      for (const ur of userRoles) {
        for (const rp of ur.role.permissions) {
          keys.add(rp.permission.key);
        }
      }
      return Array.from(keys);
    });
  }
}
