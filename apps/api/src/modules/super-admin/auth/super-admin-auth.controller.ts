import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { SuperAdminAuthService } from './super-admin-auth.service';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';
import { SuperAdminRefreshDto } from './dto/super-admin-refresh.dto';
import { SuperAdminAuthGuard } from './guards/super-admin-auth.guard';
import { CurrentSuperAdmin } from './decorators/current-super-admin.decorator';
import type { CurrentSuperAdminPayload } from './decorators/current-super-admin.decorator';
import { Public } from '../../../common/decorators/public.decorator';

@Public()
@Controller('super-admin/auth')
export class SuperAdminAuthController {
  constructor(private readonly authService: SuperAdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: SuperAdminLoginDto,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    return this.authService.login(dto, ip, userAgent);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: SuperAdminRefreshDto,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    return this.authService.refresh(dto.refreshToken, ip, userAgent);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SuperAdminAuthGuard)
  async logout(
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Body() dto: SuperAdminRefreshDto,
  ) {
    await this.authService.logout(admin.superAdminId, dto.refreshToken);
  }
}
