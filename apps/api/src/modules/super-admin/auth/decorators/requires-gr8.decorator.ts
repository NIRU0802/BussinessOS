import { applyDecorators, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '../guards/super-admin-auth.guard';
import { RequiresGr8Guard } from '../guards/requires-gr8.guard';

export function RequiresGR8() {
  return applyDecorators(UseGuards(SuperAdminAuthGuard, RequiresGr8Guard));
}
