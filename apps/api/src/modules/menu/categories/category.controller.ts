import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';

@Controller('menu/categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @RequirePermissions('menu.read')
  list() {
    return this.categoryService.list();
  }

  @Get(':id')
  @RequirePermissions('menu.read')
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Post()
  @RequirePermissions('menu.write')
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('menu.write')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('menu.write')
  remove(@Param('id') id: string) {
    return this.categoryService.softDelete(id);
  }
}
