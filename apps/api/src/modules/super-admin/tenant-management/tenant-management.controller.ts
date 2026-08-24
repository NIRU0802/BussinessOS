import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Ip,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { TenantManagementService } from './tenant-management.service';
import { TenantListQueryDto } from './dto/tenant-list-query.dto';
import { SuspendTenantDto } from './dto/suspend-tenant.dto';
import { RequiresSuperAdmin } from '../auth/decorators/requires-super-admin.decorator';
import { RequiresGR8 } from '../auth/decorators/requires-gr8.decorator';
import { CurrentSuperAdmin } from '../auth/decorators/current-super-admin.decorator';
import type { CurrentSuperAdminPayload } from '../auth/decorators/current-super-admin.decorator';
import { Public } from '../../../common/decorators/public.decorator';

@Public()
@Controller('super-admin/tenants')
export class TenantManagementController {
  constructor(private readonly tenantService: TenantManagementService) {}

  private buildAuditContext(
    admin: CurrentSuperAdminPayload,
    ip: string,
    req: Request,
  ) {
    return {
      superAdminId: admin.superAdminId,
      adminType: admin.adminType,
      ipAddress: ip,
      userAgent: (req.headers['user-agent'] as string) ?? 'unknown',
    };
  }

  @Get()
  @RequiresSuperAdmin()
  async list(
    @Query() query: TenantListQueryDto,
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.tenantService.listTenants(
      query,
      this.buildAuditContext(admin, ip, req),
    );
  }

  @Get(':id')
  @RequiresSuperAdmin()
  async getDetail(
    @Param('id') id: string,
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.tenantService.getTenantDetailForTeam(
      id,
      this.buildAuditContext(admin, ip, req),
    );
  }

  @Get(':id/business-content')
  @RequiresGR8()
  async getBusinessContent(
    @Param('id') id: string,
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.tenantService.getTenantBusinessContentForGr8(
      id,
      this.buildAuditContext(admin, ip, req),
    );
  }

  @Post(':id/suspend')
  @RequiresSuperAdmin()
  async suspend(
    @Param('id') id: string,
    @Body() dto: SuspendTenantDto,
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.tenantService.suspendTenant(
      id,
      dto.reason,
      this.buildAuditContext(admin, ip, req),
    );
  }

  @Post(':id/reactivate')
  @RequiresSuperAdmin()
  async reactivate(
    @Param('id') id: string,
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.tenantService.reactivateTenant(
      id,
      this.buildAuditContext(admin, ip, req),
    );
  }
}
