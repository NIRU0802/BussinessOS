import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { SuperAdminAuditService } from '../common/super-admin-audit.service';
import { SubscriptionService } from '../../billing/subscription.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DEFAULT_ROLE_PERMISSIONS } from '../../rbac/rbac.service';
import { BUSINESS_TYPE_PRESET_KEYS } from '../../widgets/presets/business-type-presets';
import { OnboardTenantDto } from './dto/onboard-tenant.dto';
import type { AuditContext } from '../tenant-management/tenant-management.service';

const NON_OWNER_ROLE_NAMES = [
  'MANAGER',
  'CASHIER',
  'CHEF',
  'KITCHEN_STAFF',
  'WAREHOUSE',
  'ACCOUNTANT',
  'DELIVERY_RIDER',
  'CUSTOMER',
];

function generateTempPassword(): string {
  // Excludes visually ambiguous characters (0/O, 1/I/l) since this string
  // gets read off a screen and typed in by hand on first login.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 12; i++) {
    pwd += chars[crypto.randomInt(0, chars.length)];
  }
  return pwd;
}

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: SuperAdminAuditService,
    private readonly subscriptionService: SubscriptionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  getBusinessTypes(): string[] {
    return [...BUSINESS_TYPE_PRESET_KEYS];
  }

  getAssignableRoles(): string[] {
    return NON_OWNER_ROLE_NAMES;
  }

  /**
   * Creates a brand-new tenant plus its Owner login and any additional
   * role-based logins (Manager, Cashier, etc.), then activates the
   * Super-Admin-selected subscription plan. Mirrors AuthService.register()'s
   * transaction pattern (SET LOCAL app.current_tenant_id, since there's no
   * tenant context yet until the tenant row itself is created) but extends
   * it to seed multiple logins and a specific plan rather than a single
   * Owner + a default trial.
   */
  async onboardTenant(dto: OnboardTenantDto, ctx: AuditContext) {
    if (!dto.planId && !dto.customPlan) {
      throw new BadRequestException(
        'Either planId or customPlan must be provided.',
      );
    }
    if (dto.planId && dto.customPlan) {
      throw new BadRequestException(
        'Provide only one of planId or customPlan, not both.',
      );
    }

    const slug = this.slugify(dto.tenantName);
    const newTenantId = crypto.randomUUID();

    const existingSlug = await this.prisma.tenant.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      throw new ConflictException(
        'A tenant with a similar name already exists. Please choose a different name.',
      );
    }

    // Custom one-off plan: created with isActive: false so it never appears
    // in the public Plans list or any other tenant's plan dropdown, but is
    // fully usable for this specific subscription via its own plan ID.
    let resolvedPlanId = dto.planId;
    if (dto.customPlan) {
      const createdPlan = await this.prisma.plan.create({
        data: {
          name: dto.customPlan.name,
          price: dto.customPlan.price,
          billingCycle: dto.customPlan.billingCycle as any,
          description: `Custom plan for ${dto.tenantName}, created during onboarding.`,
          isActive: false,
        },
      });
      resolvedPlanId = createdPlan.id;
    }

    const ownerPasswordHash = await argon2.hash(dto.owner.password);

    const additionalUsersPlan = (dto.additionalUsers ?? []).map((u) => ({
      ...u,
      tempPassword: generateTempPassword(),
    }));

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SET LOCAL app.current_tenant_id = '${newTenantId}'`,
      );

      const tenant = await tx.tenant.create({
        data: {
          id: newTenantId,
          name: dto.tenantName,
          slug,
          businessType: dto.businessType,
        },
      });

      const ownerRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'OWNER',
          description: 'Full access to all tenant resources',
          isSystem: true,
        },
      });

      const ownerUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.owner.email.toLowerCase(),
          passwordHash: ownerPasswordHash,
          firstName: dto.owner.firstName,
          lastName: dto.owner.lastName,
          phone: dto.owner.phone,
          isAllBranches: true,
          roles: { create: [{ tenantId: tenant.id, roleId: ownerRole.id }] },
        },
      });

      const createdAdditionalUsers: Array<{
        id: string;
        email: string;
        roleName: string;
        tempPassword: string;
      }> = [];

      for (const u of additionalUsersPlan) {
        const permissionKeys = DEFAULT_ROLE_PERMISSIONS[u.roleName] ?? [];
        const permissions = await tx.permission.findMany({
          where: { key: { in: permissionKeys } },
        });

        const role = await tx.role.upsert({
          where: {
            tenantId_name: { tenantId: tenant.id, name: u.roleName as any },
          },
          create: {
            tenantId: tenant.id,
            name: u.roleName as any,
            description: `${u.roleName} role`,
            isSystem: true,
            permissions: {
              create: permissions.map((p) => ({ permissionId: p.id })),
            },
          },
          update: {},
        });

        const passwordHash = await argon2.hash(u.tempPassword);

        const createdUser = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email: u.email.toLowerCase(),
            passwordHash,
            firstName: u.firstName,
            lastName: u.lastName,
            phone: u.phone,
            isAllBranches: true,
            roles: { create: [{ tenantId: tenant.id, roleId: role.id }] },
          },
        });

        createdAdditionalUsers.push({
          id: createdUser.id,
          email: createdUser.email,
          roleName: u.roleName,
          tempPassword: u.tempPassword,
        });
      }

      return { tenant, ownerUser, createdAdditionalUsers };
    });

    // tenant.created fires after the main transaction commits so listeners
    // (e.g. ExpenseCategoriesService.seedDefaultCategories) can safely use
    // prisma.forTenant() against an already-committed tenant row.
    this.eventEmitter.emit('tenant.created', { tenantId: result.tenant.id });

    // Subscription created after the main transaction commits Ã¢â‚¬â€ SubscriptionService
    // uses prisma.forTenant() (its own transaction), which needs the tenant row
    // already committed. trialDays: 0 since this is a Super-Admin-activated real
    // plan, not a self-serve trial signup.
    await this.subscriptionService.createInitialSubscription(
      result.tenant.id,
      resolvedPlanId!,
      0,
    );

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: result.tenant.id,
      action: 'onboarding.create_tenant',
      resourceType: 'tenant',
      resourceId: result.tenant.id,
      metadata: {
        tenantName: dto.tenantName,
        businessType: dto.businessType,
        planId: resolvedPlanId,
        isCustomPlan: !!dto.customPlan,
        ownerEmail: dto.owner.email,
        additionalUserCount: result.createdAdditionalUsers.length,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return {
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        businessType: dto.businessType,
      },
      owner: {
        id: result.ownerUser.id,
        email: result.ownerUser.email,
        password: dto.owner.password,
      },
      additionalUsers: result.createdAdditionalUsers,
    };
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
