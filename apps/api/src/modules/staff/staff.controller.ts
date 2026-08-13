import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @RequirePermissions('staff.read')
  list() {
    return this.staffService.list();
  }

  @Get(':id')
  @RequirePermissions('staff.read')
  findOne(@Param('id') id: string) {
    return this.staffService.findOne(id);
  }

  @Post()
  @RequirePermissions('staff.write')
  create(@Body() dto: CreateStaffUserDto) {
    return this.staffService.createStaffUser(dto);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('staff.write')
  deactivate(@Param('id') id: string) {
    return this.staffService.deactivate(id);
  }
}
