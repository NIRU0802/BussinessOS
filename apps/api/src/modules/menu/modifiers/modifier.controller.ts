import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ModifierService } from './modifier.service';
import { CreateModifierGroupDto } from '../dto/create-modifier-group.dto';
import { CreateModifierOptionDto } from '../dto/create-modifier-option.dto';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';

@Controller('menu/modifier-groups')
export class ModifierController {
  constructor(private readonly modifierService: ModifierService) {}

  @Get()
  @RequirePermissions('menu.read')
  list() {
    return this.modifierService.listGroups();
  }

  @Get(':id')
  @RequirePermissions('menu.read')
  findOne(@Param('id') id: string) {
    return this.modifierService.findGroup(id);
  }

  @Post()
  @RequirePermissions('menu.write')
  create(@Body() dto: CreateModifierGroupDto) {
    return this.modifierService.createGroup(dto);
  }

  @Post(':id/options')
  @RequirePermissions('menu.write')
  addOption(@Param('id') id: string, @Body() dto: CreateModifierOptionDto) {
    return this.modifierService.addOption(id, dto);
  }

  @Delete('options/:optionId')
  @RequirePermissions('menu.write')
  removeOption(@Param('optionId') optionId: string) {
    return this.modifierService.removeOption(optionId);
  }

  @Delete(':id')
  @RequirePermissions('menu.write')
  remove(@Param('id') id: string) {
    return this.modifierService.deleteGroup(id);
  }
}
