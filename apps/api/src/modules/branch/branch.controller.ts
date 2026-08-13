import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { AssignBranchDto } from './dto/assign-branch.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Get()
  list() {
    return this.branchService.listAccessible();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.branchService.findOne(id);
  }

  @Post()
  @RequirePermissions('branches.write')
  create(@Body() dto: CreateBranchDto) {
    return this.branchService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('branches.write')
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('branches.write')
  remove(@Param('id') id: string) {
    return this.branchService.softDelete(id);
  }

  @Post('assign')
  @RequirePermissions('staff.write')
  assign(@Body() dto: AssignBranchDto) {
    return this.branchService.assignUserToBranch(dto);
  }

  @Delete('assign/:userId/:branchId')
  @RequirePermissions('staff.write')
  revoke(@Param('userId') userId: string, @Param('branchId') branchId: string) {
    return this.branchService.revokeUserFromBranch(userId, branchId);
  }
}
