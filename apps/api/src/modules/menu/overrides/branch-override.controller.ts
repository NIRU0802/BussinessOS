import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { BranchOverrideService } from './branch-override.service';
import { SetBranchOverrideDto } from '../dto/set-branch-override.dto';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';

@Controller('menu/branch-overrides')
export class BranchOverrideController {
  constructor(private readonly overrideService: BranchOverrideService) {}

  @Get('branch/:branchId')
  @RequirePermissions('menu.read')
  listForBranch(@Param('branchId') branchId: string) {
    return this.overrideService.listForBranch(branchId);
  }

  @Post()
  @RequirePermissions('menu.write')
  setOverride(@Body() dto: SetBranchOverrideDto) {
    return this.overrideService.setOverride(dto);
  }

  @Delete(':branchId/:menuItemId')
  @RequirePermissions('menu.write')
  clearOverride(
    @Param('branchId') branchId: string,
    @Param('menuItemId') menuItemId: string,
  ) {
    return this.overrideService.clearOverride(branchId, menuItemId);
  }
}
