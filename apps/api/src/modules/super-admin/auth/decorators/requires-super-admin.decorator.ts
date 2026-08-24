import { applyDecorators, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '../guards/super-admin-auth.guard';

export function RequiresSuperAdmin() {
  return applyDecorators(UseGuards(SuperAdminAuthGuard));
}
