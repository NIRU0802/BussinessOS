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
import { InventoryItemsService } from './inventory-items.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RequiresWidget } from '../widgets/decorators/requires-widget.decorator';
import { WidgetGuard } from '../widgets/guards/widget.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';

// JwtAuthGuard and PermissionsGuard are global via APP_GUARD — not
// re-declared here, consistent with the rest of the codebase.
// WidgetGuard is NOT global, so it's applied explicitly on every route.

@Controller('inventory/items')
@RequiresWidget('inventory')
@UseGuards(WidgetGuard)
export class InventoryItemsController {
  constructor(private readonly inventoryItemsService: InventoryItemsService) {}

  @Get()
  @RequirePermissions('inventory.read')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.inventoryItemsService.list(
      user.tenantId,
      includeInactive === 'true',
    );
  }

  @Post()
  @RequirePermissions('inventory.write')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInventoryItemDto,
  ) {
    return this.inventoryItemsService.create(user.tenantId, dto);
  }

  @Get(':id')
  @RequirePermissions('inventory.read')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.inventoryItemsService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('inventory.write')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.inventoryItemsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('inventory.write')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.inventoryItemsService.softDelete(user.tenantId, id);
  }
}
