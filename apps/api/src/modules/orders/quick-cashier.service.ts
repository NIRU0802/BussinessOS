import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { QuickLoginDto } from './dto/quick-login.dto';
import { ToggleQuickCashierDto } from './dto/toggle-quick-cashier.dto';
import { SetPinDto } from './dto/set-pin.dto';

interface RequestUser {
  id: string;
  tenantId: string;
  permissions: string[];
}

const PIN_SALT_ROUNDS = 12;

@Injectable()
export class QuickCashierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async setEnabled(user: RequestUser, dto: ToggleQuickCashierDto) {
    if (
      !user.permissions.includes('*') &&
      !user.permissions.includes('settings.manage')
    ) {
      throw new ForbiddenException(
        'You do not have permission to change this setting.',
      );
    }

    const setting = await this.prisma.forTenant(user.tenantId, (tx) =>
      tx.quickCashierSetting.upsert({
        where: {
          tenantId_branchId: {
            tenantId: user.tenantId,
            branchId: dto.branchId,
          },
        },
        update: { enabled: dto.enabled },
        create: {
          tenantId: user.tenantId,
          branchId: dto.branchId,
          enabled: dto.enabled,
        },
      }),
    );

    await this.auditLog.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'quick_cashier.setting_changed',
      entityType: 'branch',
      entityId: dto.branchId,
      metadata: { enabled: dto.enabled },
    });

    return setting;
  }

  async getSetting(user: RequestUser, branchId: string) {
    const setting = await this.prisma.forTenant(user.tenantId, (tx) =>
      tx.quickCashierSetting.findUnique({
        where: { tenantId_branchId: { tenantId: user.tenantId, branchId } },
      }),
    );
    return setting ?? { tenantId: user.tenantId, branchId, enabled: false };
  }

  async setPin(user: RequestUser, dto: SetPinDto) {
    const pinHash = await bcrypt.hash(dto.pin, PIN_SALT_ROUNDS);

    const record = await this.prisma.forTenant(user.tenantId, (tx) =>
      tx.userPin.upsert({
        where: {
          tenantId_userId: { tenantId: user.tenantId, userId: user.id },
        },
        update: { pinHash },
        create: { tenantId: user.tenantId, userId: user.id, pinHash },
      }),
    );

    await this.auditLog.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'quick_cashier.pin_set',
      entityType: 'user',
      entityId: user.id,
      metadata: {},
    });

    return { success: true, updatedAt: record.updatedAt };
  }

  // ---------------------------------------------------------------------
  // Quick login: PIN-based auth for an EXISTING account, same permissions
  // as full login. Token payload is built with the EXACT same shape and
  // logic as AuthService.login() — sub, tenantId, branchIds, isAllBranches,
  // roles, permissions — signed with the same secret/TTL, so JwtStrategy
  // and PermissionsGuard treat quick-login and full-login tokens
  // identically. No refresh token is issued here (shared-terminal PIN
  // login is short-lived by design — re-PIN when the access token expires
  // rather than silently refreshing in the background).
  // ---------------------------------------------------------------------
  async quickLogin(dto: QuickLoginDto, tenantId: string) {
    const setting = await this.prisma.forTenant(tenantId, (tx) =>
      tx.quickCashierSetting.findUnique({
        where: { tenantId_branchId: { tenantId, branchId: dto.branchId } },
      }),
    );
    if (!setting?.enabled) {
      throw new ForbiddenException(
        'Quick Cashier Switch is not enabled for this branch. Use full login.',
      );
    }

    const pinRecord = await this.prisma.forTenant(tenantId, (tx) =>
      tx.userPin.findUnique({
        where: { tenantId_userId: { tenantId, userId: dto.userId } },
      }),
    );
    if (!pinRecord) {
      throw new NotFoundException('No PIN configured for this account.');
    }

    const valid = await bcrypt.compare(dto.pin, pinRecord.pinHash);
    if (!valid) {
      throw new ForbiddenException('Incorrect PIN.');
    }

    const user = await this.prisma.forTenant(tenantId, (tx) =>
      tx.user.findFirst({
        where: { id: dto.userId, isActive: true, deletedAt: null },
        include: {
          roles: {
            include: {
              role: {
                include: { permissions: { include: { permission: true } } },
              },
            },
          },
          branches: true,
        },
      }),
    );
    if (!user) {
      throw new NotFoundException('User not found or inactive.');
    }

    const roleNames = user.roles.map((ur) => ur.role.name);
    const isOwner = roleNames.includes('OWNER');
    const permissions = isOwner
      ? ['*']
      : Array.from(
          new Set(
            user.roles.flatMap((ur) =>
              ur.role.permissions.map((rp) => rp.permission.key),
            ),
          ),
        );

    await this.prisma.forTenant(tenantId, (tx) =>
      tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
    );

    await this.auditLog.log({
      tenantId,
      userId: user.id,
      action: 'quick_cashier.login',
      entityType: 'user',
      entityId: user.id,
      metadata: { branchId: dto.branchId },
    });

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        tenantId,
        branchIds: user.branches.map((b) => b.branchId),
        isAllBranches: user.isAllBranches,
        roles: roleNames,
        permissions,
      },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_TTL') ?? '900s',
      } as JwtSignOptions,
    );

    return {
      accessToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: roleNames,
      },
    };
  }
}
