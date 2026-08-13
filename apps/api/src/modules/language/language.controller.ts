import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { TenantRequestContext } from '../../common/tenant-context/tenant-context.service';
import { LanguageService } from './language.service';
import { SetLanguagesDto } from './dto/set-languages.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('language')
export class LanguageController {
  constructor(private readonly languageService: LanguageService) {}

  @Get()
  @RequirePermissions('SETTINGS_VIEW')
  get(@CurrentUser() user: TenantRequestContext) {
    return this.languageService.getTenantLanguages(user.tenantId);
  }

  @Post()
  @RequirePermissions('SETTINGS_MANAGE')
  set(@CurrentUser() user: TenantRequestContext, @Body() dto: SetLanguagesDto) {
    return this.languageService.setTenantLanguages(user.tenantId, dto);
  }
}
