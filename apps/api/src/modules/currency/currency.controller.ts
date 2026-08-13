import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { TenantRequestContext } from '../../common/tenant-context/tenant-context.service';
import { CurrencyService } from './currency.service';
import { SetCurrencyDto } from './dto/set-currency.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get()
  @RequirePermissions('SETTINGS_VIEW')
  async get(@CurrentUser() user: TenantRequestContext) {
    const currency = await this.currencyService.getTenantCurrency(
      user.tenantId,
    );
    return { currency };
  }

  @Post()
  @RequirePermissions('SETTINGS_MANAGE')
  set(@CurrentUser() user: TenantRequestContext, @Body() dto: SetCurrencyDto) {
    return this.currencyService.setTenantCurrency(user.tenantId, dto.currency);
  }
}
