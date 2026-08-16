import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductIngredientsService } from './product-ingredients.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RequiresWidget } from '../widgets/decorators/requires-widget.decorator';
import { WidgetGuard } from '../widgets/guards/widget.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { CreateProductIngredientDto } from './dto/create-product-ingredient.dto';
import { UpdateProductIngredientDto } from './dto/update-product-ingredient.dto';
import { ProductIdQueryDto } from './dto/product-id-query.dto';

@Controller('inventory/product-ingredients')
@RequiresWidget('inventory')
@UseGuards(WidgetGuard)
export class ProductIngredientsController {
  constructor(
    private readonly productIngredientsService: ProductIngredientsService,
  ) {}

  @Get()
  @RequirePermissions('inventory.read')
  listForProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ProductIdQueryDto,
  ) {
    return this.productIngredientsService.listForProduct(
      user.tenantId,
      query.productId,
    );
  }

  @Post()
  @RequirePermissions('inventory.write')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProductIngredientDto,
  ) {
    return this.productIngredientsService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermissions('inventory.write')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductIngredientDto,
  ) {
    return this.productIngredientsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('inventory.write')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.productIngredientsService.remove(user.tenantId, id);
  }
}
