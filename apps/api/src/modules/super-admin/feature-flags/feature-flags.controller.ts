import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Ip,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { FeatureFlagsService } from './feature-flags.service';
import { CreateFlagDto } from './dto/create-flag.dto';
import { SetFlagOverrideDto } from './dto/set-flag-override.dto';
import { RequiresSuperAdmin } from '../auth/decorators/requires-super-admin.decorator';
import { CurrentSuperAdmin } from '../auth/decorators/current-super-admin.decorator';
import type { CurrentSuperAdminPayload } from '../auth/decorators/current-super-admin.decorator';
import { Public } from '../../../common/decorators/public.decorator';

@Public()
@Controller('super-admin/feature-flags')
export class FeatureFlagsController {
  constructor(private readonly flagsService: FeatureFlagsService) {}

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
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.flagsService.listFlags(this.buildAuditContext(admin, ip, req));
  }

  @Post()
  @RequiresSuperAdmin()
  async create(
    @Body() dto: CreateFlagDto,
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.flagsService.createFlag(
      dto,
      this.buildAuditContext(admin, ip, req),
    );
  }

  @Patch(':id/global')
  @RequiresSuperAdmin()
  async toggleGlobal(
    @Param('id') id: string,
    @Body('isEnabled') isEnabled: boolean,
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.flagsService.toggleGlobal(
      id,
      isEnabled,
      this.buildAuditContext(admin, ip, req),
    );
  }

  @Post(':id/overrides')
  @RequiresSuperAdmin()
  async setOverride(
    @Param('id') id: string,
    @Body() dto: SetFlagOverrideDto,
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.flagsService.setTenantOverride(
      id,
      dto,
      this.buildAuditContext(admin, ip, req),
    );
  }

  @Delete(':id/overrides/:tenantId')
  @RequiresSuperAdmin()
  async removeOverride(
    @Param('id') id: string,
    @Param('tenantId') tenantId: string,
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.flagsService.removeTenantOverride(
      id,
      tenantId,
      this.buildAuditContext(admin, ip, req),
    );
  }
}
