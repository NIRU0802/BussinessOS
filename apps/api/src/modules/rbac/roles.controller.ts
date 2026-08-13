import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('roles')
export class RolesController {
  constructor(private readonly rbacService: RbacService) {}

  @Get()
  @RequirePermissions('staff.read')
  list() {
    return this.rbacService.listRoles();
  }

  @Post()
  @RequirePermissions('staff.write')
  create(@Body() dto: CreateRoleDto) {
    return this.rbacService.createRole(dto);
  }

  @Post('assign')
  @RequirePermissions('staff.write')
  assign(@Body() dto: AssignRoleDto) {
    return this.rbacService.assignRoleToUser(dto);
  }

  @Delete(':userId/:roleId')
  @RequirePermissions('staff.write')
  revoke(@Param('userId') userId: string, @Param('roleId') roleId: string) {
    return this.rbacService.revokeRoleFromUser(userId, roleId);
  }
}
