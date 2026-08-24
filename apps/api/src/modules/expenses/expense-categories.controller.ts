import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RequiresWidget } from '../widgets/decorators/requires-widget.decorator';
import { TenantContextService } from '../../common/tenant-context/tenant-context.service';
import { ExpenseCategoriesService } from './expense-categories.service';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';

@UseGuards(AuthGuard('jwt'))
@RequiresWidget('expenses')
@Controller('expense-categories')
export class ExpenseCategoriesController {
  constructor(
    private readonly categoriesService: ExpenseCategoriesService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Get()
  @RequirePermissions('expenses.read')
  findAll() {
    const { tenantId } = this.tenantContext.getContext();
    return this.categoriesService.findAll(tenantId);
  }

  @Post()
  @RequirePermissions('expense_categories.manage')
  create(@Body() dto: CreateExpenseCategoryDto) {
    const { tenantId } = this.tenantContext.getContext();
    return this.categoriesService.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermissions('expense_categories.manage')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseCategoryDto,
  ) {
    const { tenantId } = this.tenantContext.getContext();
    return this.categoriesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('expense_categories.manage')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    const { tenantId } = this.tenantContext.getContext();
    return this.categoriesService.remove(tenantId, id);
  }
}
