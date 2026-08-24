import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SuperAdminAuditService } from '../common/super-admin-audit.service';
import { AuditContext } from '../tenant-management/tenant-management.service';
import { CreateFlagDto } from './dto/create-flag.dto';
import { SetFlagOverrideDto } from './dto/set-flag-override.dto';

@Injectable()
export class FeatureFlagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: SuperAdminAuditService,
  ) {}

  async listFlags(ctx: AuditContext) {
    const flags = await this.prisma.featureFlag.findMany({
      include: {
        overrides: {
          select: { tenantId: true, isEnabled: true },
        },
      },
      orderBy: { key: 'asc' },
    });

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: null,
      action: 'feature_flag.list',
      resourceType: 'feature_flag',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return flags.map((f) => ({
      id: f.id,
      key: f.key,
      description: f.description,
      isEnabledGlobally: f.isEnabledGlobally,
      overrideCount: f.overrides.length,
      overrides: f.overrides,
      createdAt: f.createdAt,
    }));
  }

  async createFlag(dto: CreateFlagDto, ctx: AuditContext) {
    const created = await this.prisma.featureFlag.create({
      data: {
        key: dto.key,
        description: dto.description,
        isEnabledGlobally: dto.isEnabledGlobally ?? false,
      },
    });

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: null,
      action: 'feature_flag.create',
      resourceType: 'feature_flag',
      resourceId: created.id,
      metadata: { key: created.key },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return created;
  }

  async toggleGlobal(flagId: string, isEnabled: boolean, ctx: AuditContext) {
    const flag = await this.findFlagOrThrow(flagId);

    const updated = await this.prisma.featureFlag.update({
      where: { id: flagId },
      data: { isEnabledGlobally: isEnabled },
    });

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: null,
      action: 'feature_flag.toggle_global',
      resourceType: 'feature_flag',
      resourceId: flagId,
      metadata: { key: flag.key, isEnabledGlobally: isEnabled },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return updated;
  }

  async setTenantOverride(
    flagId: string,
    dto: SetFlagOverrideDto,
    ctx: AuditContext,
  ) {
    const flag = await this.findFlagOrThrow(flagId);

    const tenant = await this.prisma.tenant.findFirst({
      where: { id: dto.tenantId, deletedAt: null },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant "${dto.tenantId}" not found`);
    }

    const override = await this.prisma.featureFlagTenantOverride.upsert({
      where: {
        featureFlagId_tenantId: {
          featureFlagId: flagId,
          tenantId: dto.tenantId,
        },
      },
      create: {
        featureFlagId: flagId,
        tenantId: dto.tenantId,
        isEnabled: dto.isEnabled,
      },
      update: { isEnabled: dto.isEnabled },
    });

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: dto.tenantId,
      action: 'feature_flag.set_tenant_override',
      resourceType: 'feature_flag',
      resourceId: flagId,
      metadata: {
        flagKey: flag.key,
        tenantName: tenant.name,
        isEnabled: dto.isEnabled,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return override;
  }

  async removeTenantOverride(
    flagId: string,
    tenantId: string,
    ctx: AuditContext,
  ) {
    const flag = await this.findFlagOrThrow(flagId);

    await this.prisma.featureFlagTenantOverride.deleteMany({
      where: { featureFlagId: flagId, tenantId },
    });

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: tenantId,
      action: 'feature_flag.remove_tenant_override',
      resourceType: 'feature_flag',
      resourceId: flagId,
      metadata: { flagKey: flag.key },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { flagId, tenantId, removed: true };
  }

  private async findFlagOrThrow(flagId: string) {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { id: flagId },
    });
    if (!flag) {
      throw new NotFoundException(`Feature flag "${flagId}" not found`);
    }
    return flag;
  }
}
