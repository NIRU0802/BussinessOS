import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { TenantRequestContext } from '../../common/tenant-context/tenant-context.service';
import { TaxService } from './tax.service';
import { CreateTaxClassDto } from './dto/create-tax-class.dto';
import { CreateTaxRuleDto } from './dto/create-tax-rule.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tax')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Post('classes')
  @RequirePermissions('SETTINGS_MANAGE')
  createClass(
    @CurrentUser() user: TenantRequestContext,
    @Body() dto: CreateTaxClassDto,
  ) {
    return this.taxService.createTaxClass(user.tenantId, dto);
  }

  @Get('classes')
  @RequirePermissions('SETTINGS_VIEW')
  listClasses(@CurrentUser() user: TenantRequestContext) {
    return this.taxService.listTaxClasses(user.tenantId);
  }

  @Post('rules')
  @RequirePermissions('SETTINGS_MANAGE')
  createRule(
    @CurrentUser() user: TenantRequestContext,
    @Body() dto: CreateTaxRuleDto,
  ) {
    return this.taxService.createTaxRule(user.tenantId, dto);
  }
}
