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
import { PlansManagementService } from './plans-management.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { AssignPlanDto } from './dto/assign-plan.dto';
import { RequiresSuperAdmin } from '../auth/decorators/requires-super-admin.decorator';
import { CurrentSuperAdmin } from '../auth/decorators/current-super-admin.decorator';
import type { CurrentSuperAdminPayload } from '../auth/decorators/current-super-admin.decorator';
import { Public } from '../../../common/decorators/public.decorator';

@Public()
@Controller('super-admin/plans')
export class PlansManagementController {
  constructor(private readonly plansService: PlansManagementService) {}

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
    return this.plansService.listPlans(this.buildAuditContext(admin, ip, req));
  }

  @Get(':id')
  @RequiresSuperAdmin()
  async getOne(
    @Param('id') id: string,
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.plansService.getPlan(
      id,
      this.buildAuditContext(admin, ip, req),
    );
  }

  @Post()
  @RequiresSuperAdmin()
  async create(
    @Body() dto: CreatePlanDto,
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.plansService.createPlan(
      dto,
      this.buildAuditContext(admin, ip, req),
    );
  }

  @Patch(':id')
  @RequiresSuperAdmin()
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.plansService.updatePlan(
      id,
      dto,
      this.buildAuditContext(admin, ip, req),
    );
  }

  @Delete(':id')
  @RequiresSuperAdmin()
  async remove(
    @Param('id') id: string,
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.plansService.deletePlan(
      id,
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
    return this.plansService.reactivatePlan(
      id,
      this.buildAuditContext(admin, ip, req),
    );
  }

  @Post('assign')
  @RequiresSuperAdmin()
  async assign(
    @Body() dto: AssignPlanDto,
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.plansService.assignPlanToTenant(
      dto,
      this.buildAuditContext(admin, ip, req),
    );
  }
}
