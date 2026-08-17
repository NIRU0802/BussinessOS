import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { SubscriptionService } from '../billing/subscription.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLog: AuditLogService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * Registers a brand-new tenant + its first Owner user in one transaction.
   * This is the ONLY flow that creates a tenant without an existing
   * authenticated/tenant-scoped context, so it deliberately uses the raw
   * $transaction (not forTenant) — there's no tenant_id to scope by yet
   * until the tenant row itself is created inside this same transaction.
   */
  async register(dto: RegisterDto) {
    const passwordHash = await argon2.hash(dto.password);
    const slug = this.slugify(dto.tenantName);

    const existingSlug = await this.prisma.tenant.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      throw new ConflictException(
        'A tenant with a similar name already exists. Please choose a different name.',
      );
    }

    const newTenantId = crypto.randomUUID();

    const result = await this.prisma.$transaction(async (tx) => {
      const existingSlug = await tx.tenant.findUnique({ where: { slug } });
      if (existingSlug) {
        throw new ConflictException(
          'A tenant with a similar name already exists. Please choose a different name.',
        );
      }

      await tx.$executeRawUnsafe(
        `SET LOCAL app.current_tenant_id = '${newTenantId}'`,
      );

      const tenant = await tx.tenant.create({
        data: { id: newTenantId, name: dto.tenantName, slug },
      });

      const ownerRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'OWNER',
          description: 'Full access to all tenant resources',
          isSystem: true,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          isAllBranches: true,
          roles: { create: [{ tenantId: tenant.id, roleId: ownerRole.id }] },
        },
      });

      return { tenant, user };
    });

    await this.auditLog.log({
      tenantId: result.tenant.id,
      userId: result.user.id,
      action: 'auth.register',
      entityType: 'Tenant',
      entityId: result.tenant.id,
    });

    // Trial subscription is created AFTER the main transaction commits,
    // since SubscriptionService uses prisma.forTenant() (its own
    // transaction) rather than the raw `tx` client used above — the
    // tenant row must already exist and be committed for RLS to allow
    // a forTenant() call against it. Deliberately non-fatal: a tenant
    // should never be blocked from registering just because trial-plan
    // provisioning failed; this gets flagged for manual follow-up
    // instead of surfacing a confusing error to a brand-new user.
    const defaultTrialPlanId = this.configService.get<string>(
      'DEFAULT_TRIAL_PLAN_ID',
    );
    if (defaultTrialPlanId) {
      try {
        await this.subscriptionService.createInitialSubscription(
          result.tenant.id,
          defaultTrialPlanId,
        );
      } catch (err) {
        await this.auditLog.log({
          tenantId: result.tenant.id,
          userId: result.user.id,
          action: 'auth.register.trial_subscription_failed',
          metadata: { error: err.message },
        });
      }
    } else {
      await this.auditLog.log({
        tenantId: result.tenant.id,
        userId: result.user.id,
        action: 'auth.register.trial_subscription_skipped',
        metadata: { reason: 'DEFAULT_TRIAL_PLAN_ID not configured' },
      });
    }

    const tokens = await this.issueTokenPair({
      userId: result.user.id,
      tenantId: result.tenant.id,
      branchIds: [],
      isAllBranches: true,
      roles: ['OWNER'],
      permissions: ['*'],
    });

    return {
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    });

    if (!tenant || !tenant.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.prisma.forTenant(tenant.id, async (tx) => {
      const found = await tx.user.findFirst({
        where: {
          email: dto.email.toLowerCase(),
          isActive: true,
          deletedAt: null,
        },
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
      });
      return found;
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      await this.auditLog.log({
        tenantId: tenant.id,
        userId: user.id,
        action: 'auth.login.failed',
        ipAddress: ip,
        userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
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

    await this.prisma.forTenant(tenant.id, (tx) =>
      tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
    );

    await this.auditLog.log({
      tenantId: tenant.id,
      userId: user.id,
      action: 'auth.login.success',
      ipAddress: ip,
      userAgent,
    });

    const tokens = await this.issueTokenPair(
      {
        userId: user.id,
        tenantId: tenant.id,
        branchIds: user.branches.map((b) => b.branchId),
        isAllBranches: user.isAllBranches,
        roles: roleNames,
        permissions,
      },
      ip,
      userAgent,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: roleNames,
      },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      ...tokens,
    };
  }

  async refresh(
    refreshToken: string,
    ip?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    const tokenHash = this.hashToken(refreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.isRevoked) {
      await this.prisma.forTenant(stored.tenantId, (tx) =>
        tx.refreshToken.updateMany({
          where: { family: stored.family },
          data: { isRevoked: true },
        }),
      );
      await this.auditLog.log({
        tenantId: stored.tenantId,
        userId: stored.userId,
        action: 'auth.refresh.reuse_detected',
        ipAddress: ip,
        userAgent,
      });
      throw new UnauthorizedException(
        'Refresh token reuse detected. All sessions have been revoked for security.',
      );
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.prisma.forTenant(stored.tenantId, async (tx) => {
      return tx.user.findFirst({
        where: { id: stored.userId, isActive: true, deletedAt: null },
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
      });
    });

    if (!user) {
      throw new UnauthorizedException('User no longer active');
    }

    await this.prisma.forTenant(stored.tenantId, (tx) =>
      tx.refreshToken.update({
        where: { id: stored.id },
        data: { isRevoked: true },
      }),
    );

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

    return this.issueTokenPair(
      {
        userId: user.id,
        tenantId: stored.tenantId,
        branchIds: user.branches.map((b) => b.branchId),
        isAllBranches: user.isAllBranches,
        roles: roleNames,
        permissions,
      },
      ip,
      userAgent,
      stored.family,
    );
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!stored) return { success: true };

    await this.prisma.forTenant(stored.tenantId, (tx) =>
      tx.refreshToken.update({
        where: { id: stored.id },
        data: { isRevoked: true },
      }),
    );

    await this.auditLog.log({
      tenantId: stored.tenantId,
      userId: stored.userId,
      action: 'auth.logout',
    });

    return { success: true };
  }

  private async issueTokenPair(
    claims: {
      userId: string;
      tenantId: string;
      branchIds: string[];
      isAllBranches: boolean;
      roles: string[];
      permissions: string[];
    },
    ip?: string,
    userAgent?: string,
    existingFamily?: string,
  ): Promise<TokenPair> {
    const accessToken = this.jwtService.sign(
      {
        sub: claims.userId,
        tenantId: claims.tenantId,
        branchIds: claims.branchIds,
        isAllBranches: claims.isAllBranches,
        roles: claims.roles,
        permissions: claims.permissions,
      },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_TTL') ?? '900s',
      } as JwtSignOptions,
    );

    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const family = existingFamily ?? crypto.randomUUID();
    const refreshTtl =
      this.configService.get<string>('JWT_REFRESH_TTL') ?? '30d';

    await this.prisma.forTenant(claims.tenantId, (tx) =>
      tx.refreshToken.create({
        data: {
          tenantId: claims.tenantId,
          userId: claims.userId,
          tokenHash,
          family,
          expiresAt: this.parseExpiryToDate(refreshTtl),
          ipAddress: ip,
          userAgent,
        },
      }),
    );

    return { accessToken, refreshToken: rawRefreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private parseExpiryToDate(ttl: string): Date {
    const match = ttl.match(/^(\d+)([smhd])$/);
    if (!match) {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return new Date(Date.now() + value * multipliers[unit]);
  }

  private slugify(name: string): string {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const suffix = crypto.randomBytes(3).toString('hex');
    return `${base}-${suffix}`;
  }
}
