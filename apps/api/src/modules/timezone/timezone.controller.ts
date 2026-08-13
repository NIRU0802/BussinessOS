import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { TenantRequestContext } from '../../common/tenant-context/tenant-context.service';
import { TimezoneService } from './timezone.service';
import { SetBranchTimezoneDto } from './dto/set-branch-timezone.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('timezone')
export class TimezoneController {
  constructor(private readonly timezoneService: TimezoneService) {}

  @Get(':branchId')
  @RequirePermissions('SETTINGS_VIEW')
  async get(
    @CurrentUser() user: TenantRequestContext,
    @Param('branchId') branchId: string,
  ) {
    const timezone = await this.timezoneService.getBranchTimezone(
      user.tenantId,
      branchId,
    );
    return { timezone };
  }

  @Post()
  @RequirePermissions('SETTINGS_MANAGE')
  set(
    @CurrentUser() user: TenantRequestContext,
    @Body() dto: SetBranchTimezoneDto,
  ) {
    return this.timezoneService.setBranchTimezone(user.tenantId, dto);
  }
}
