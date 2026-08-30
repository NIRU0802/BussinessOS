import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { QuickCashierService } from './quick-cashier.service';
import { SetPinDto } from './dto/set-pin.dto';
import { QuickLoginDto } from './dto/quick-login.dto';
import { ToggleQuickCashierDto } from './dto/toggle-quick-cashier.dto';
import { StaffListQueryDto } from './dto/staff-list-query.dto';
import { IsUUID } from 'class-validator';

class TenantScopedQuery {
  @IsUUID()
  tenantId: string;
}

@Controller('quick-cashier')
export class QuickCashierController {
  constructor(private readonly quickCashierService: QuickCashierService) {}

  @Post('settings')
  @RequirePermissions('settings.manage')
  setEnabled(@Req() req, @Body() dto: ToggleQuickCashierDto) {
    return this.quickCashierService.setEnabled(req.user, dto);
  }

  @Get('settings')
  @RequirePermissions('settings.manage')
  getSetting(@Req() req, @Query('branchId') branchId: string) {
    return this.quickCashierService.getSetting(req.user, branchId);
  }

  @Post('set-pin')
  setPin(@Req() req, @Body() dto: SetPinDto) {
    return this.quickCashierService.setPin(req.user, dto);
  }

  @Public()
  @Post('quick-login')
  quickLogin(@Query() query: TenantScopedQuery, @Body() dto: QuickLoginDto) {
    return this.quickCashierService.quickLogin(dto, query.tenantId);
  }

  @Public()
  @Get('staff-list')
  getStaffList(@Query() query: StaffListQueryDto) {
    return this.quickCashierService.getStaffList(
      query.tenantId,
      query.branchId,
    );
  }
}
