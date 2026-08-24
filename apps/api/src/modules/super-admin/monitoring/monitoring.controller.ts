import { Controller, Get, Query, Ip, Req } from '@nestjs/common';
import type { Request } from 'express';
import { MonitoringService } from './monitoring.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { RequiresSuperAdmin } from '../auth/decorators/requires-super-admin.decorator';
import { CurrentSuperAdmin } from '../auth/decorators/current-super-admin.decorator';
import type { CurrentSuperAdminPayload } from '../auth/decorators/current-super-admin.decorator';
import { Public } from '../../../common/decorators/public.decorator';

@Public()
@Controller('super-admin/monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

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

  @Get('health')
  @RequiresSuperAdmin()
  async getHealth(
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.monitoringService.getSystemHealth(
      this.buildAuditContext(admin, ip, req),
    );
  }

  @Get('dashboard-summary')
  @RequiresSuperAdmin()
  async getDashboardSummary(
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.monitoringService.getDashboardSummary(
      this.buildAuditContext(admin, ip, req),
    );
  }

  @Get('storage')
  @RequiresSuperAdmin()
  async getStorage(
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.monitoringService.getStorageStats(
      this.buildAuditContext(admin, ip, req),
    );
  }

  @Get('audit-logs')
  @RequiresSuperAdmin()
  async getAuditLogs(
    @Query() query: AuditLogQueryDto,
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.monitoringService.getAuditLogs(
      query,
      this.buildAuditContext(admin, ip, req),
    );
  }
}
