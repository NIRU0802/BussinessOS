import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Ip,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { WidgetManagementService } from './widget-management.service';
import { UpdateWidgetStatusDto } from './dto/update-widget-status.dto';
import { RequiresSuperAdmin } from '../auth/decorators/requires-super-admin.decorator';
import { CurrentSuperAdmin } from '../auth/decorators/current-super-admin.decorator';
import type { CurrentSuperAdminPayload } from '../auth/decorators/current-super-admin.decorator';
import { Public } from '../../../common/decorators/public.decorator';

@Public()
@Controller('super-admin/widgets')
export class WidgetManagementController {
  constructor(private readonly widgetService: WidgetManagementService) {}

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
    return this.widgetService.listWidgets(
      this.buildAuditContext(admin, ip, req),
    );
  }

  @Patch(':widgetKey/status')
  @RequiresSuperAdmin()
  async updateStatus(
    @Param('widgetKey') widgetKey: string,
    @Body() dto: UpdateWidgetStatusDto,
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.widgetService.updateWidgetStatus(
      widgetKey,
      dto,
      this.buildAuditContext(admin, ip, req),
    );
  }

  @Get('tenant/:tenantId')
  @RequiresSuperAdmin()
  async listTenantWidgets(
    @Param('tenantId') tenantId: string,
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.widgetService.listTenantWidgets(
      tenantId,
      this.buildAuditContext(admin, ip, req),
    );
  }

  @Post('tenant/:tenantId')
  @RequiresSuperAdmin()
  async setTenantWidget(
    @Param('tenantId') tenantId: string,
    @Body('widgetKey') widgetKey: string,
    @Body('isEnabled') isEnabled: boolean,
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.widgetService.setTenantWidget(
      tenantId,
      widgetKey,
      isEnabled,
      this.buildAuditContext(admin, ip, req),
    );
  }

  @Get('branch-overrides/:branchId')
  @RequiresSuperAdmin()
  async listBranchOverrides(
    @Param('branchId') branchId: string,
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.widgetService.listBranchOverrides(
      branchId,
      this.buildAuditContext(admin, ip, req),
    );
  }

  @Post('branch-overrides/:branchId')
  @RequiresSuperAdmin()
  async setBranchOverride(
    @Param('branchId') branchId: string,
    @Body('widgetKey') widgetKey: string,
    @Body('isEnabled') isEnabled: boolean,
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.widgetService.setBranchOverride(
      branchId,
      widgetKey,
      isEnabled,
      this.buildAuditContext(admin, ip, req),
    );
  }

  @Delete('branch-overrides/:branchId/:widgetKey')
  @RequiresSuperAdmin()
  async removeBranchOverride(
    @Param('branchId') branchId: string,
    @Param('widgetKey') widgetKey: string,
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.widgetService.removeBranchOverride(
      branchId,
      widgetKey,
      this.buildAuditContext(admin, ip, req),
    );
  }
}
