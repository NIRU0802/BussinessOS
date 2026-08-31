import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { BrandingService } from './branding.service';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.interface';

@Controller('branding')
export class BrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  @Get()
  async getBranding(@CurrentUser() user: AuthenticatedUser) {
    return this.brandingService.getBranding(user.tenantId);
  }

  @Patch()
  @RequirePermissions('settings.manage')
  async updateBranding(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateBrandingDto,
  ) {
    return this.brandingService.updateBranding(user.tenantId, dto);
  }

  @Post('logo')
  @RequirePermissions('settings.manage')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(@UploadedFile() file: Express.Multer.File) {
    return this.brandingService.uploadLogo(file);
  }
}
