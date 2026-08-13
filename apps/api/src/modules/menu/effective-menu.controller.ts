import { Controller, Get, Param } from '@nestjs/common';
import { EffectiveMenuService } from './effective-menu.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('menu/branch')
export class EffectiveMenuController {
  constructor(private readonly effectiveMenuService: EffectiveMenuService) {}

  @Get(':branchId/effective')
  @RequirePermissions('menu.read')
  getForBranch(@Param('branchId') branchId: string) {
    return this.effectiveMenuService.getForBranch(branchId);
  }
}
