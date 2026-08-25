import { Controller, Get, Post, Body, Ip, Req } from '@nestjs/common';
import type { Request } from 'express';
import { OnboardingService } from './onboarding.service';
import { OnboardTenantDto } from './dto/onboard-tenant.dto';
import { RequiresGR8 } from '../auth/decorators/requires-gr8.decorator';
import { CurrentSuperAdmin } from '../auth/decorators/current-super-admin.decorator';
import type { CurrentSuperAdminPayload } from '../auth/decorators/current-super-admin.decorator';
import { Public } from '../../../common/decorators/public.decorator';

@Public()
@Controller('super-admin/onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('business-types')
  @RequiresGR8()
  getBusinessTypes() {
    return { businessTypes: this.onboardingService.getBusinessTypes() };
  }

  @Get('roles')
  @RequiresGR8()
  getAssignableRoles() {
    return { roles: this.onboardingService.getAssignableRoles() };
  }

  @Post('tenants')
  @RequiresGR8()
  async onboardTenant(
    @Body() dto: OnboardTenantDto,
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.onboardingService.onboardTenant(dto, {
      superAdminId: admin.superAdminId,
      adminType: admin.adminType,
      ipAddress: ip,
      userAgent: (req.headers['user-agent'] as string) ?? 'unknown',
    });
  }
}
