import { Body, Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { KdsService } from './kds.service';
import { KdsSettingsService } from './kds-settings.service';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { UpdateKdsSettingsDto } from './dto/update-kds-settings.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    tenantId: string;
    branchIds: string[];
    isAllBranches: boolean;
    roles: string[];
    permissions: string[];
  };
}

@Controller('branches/:branchId/kds')
export class KdsController {
  constructor(
    private readonly kdsService: KdsService,
    private readonly kdsSettingsService: KdsSettingsService,
  ) {}

  @Get('tickets')
  @RequirePermissions('kds.view')
  async listTickets(
    @Param('branchId') branchId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.kdsService.listActiveTickets(req.user.tenantId, branchId);
  }

  @Patch('tickets/:ticketId/status')
  @RequirePermissions('kds.manage')
  async updateStatus(
    @Param('branchId') branchId: string,
    @Param('ticketId') ticketId: string,
    @Body() dto: UpdateTicketStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.kdsService.updateTicketStatus(
      req.user.tenantId,
      branchId,
      ticketId,
      dto.status,
      req.user.sub,
    );
  }

  @Get('settings')
  @RequirePermissions('kds.manage')
  async getSettings(
    @Param('branchId') branchId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.kdsSettingsService.getSettings(req.user.tenantId, branchId);
  }

  @Patch('settings')
  @RequirePermissions('kds.manage')
  async updateSettings(
    @Param('branchId') branchId: string,
    @Body() dto: UpdateKdsSettingsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.kdsSettingsService.updateSettings(
      req.user.tenantId,
      branchId,
      dto,
      req.user.sub,
    );
  }
}
