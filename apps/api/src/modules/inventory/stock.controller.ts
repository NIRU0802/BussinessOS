import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StockService } from './stock.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RequiresWidget } from '../widgets/decorators/requires-widget.decorator';
import { WidgetGuard } from '../widgets/guards/widget.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { BranchIdQueryDto } from './dto/branch-id-query.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { SetLowStockThresholdDto } from './dto/set-low-stock-threshold.dto';

@Controller('inventory/stock')
@RequiresWidget('inventory')
@UseGuards(WidgetGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  @RequirePermissions('inventory.read')
  listForBranch(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: BranchIdQueryDto,
  ) {
    return this.stockService.listForBranch(user.tenantId, query.branchId);
  }

  // Powers the Owner Dashboard "Low Stock" panel (Phase 14 builds the UI;
  // this is the data endpoint). branchId is optional — omit for a
  // tenant-wide summary across all branches.
  @Get('low-stock')
  @RequirePermissions('inventory.read')
  lowStockSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('branchId') branchId?: string,
  ) {
    return this.stockService.getLowStockSummary(user.tenantId, branchId);
  }

  @Post('adjust')
  @RequirePermissions('inventory.adjust')
  adjustStock(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AdjustStockDto,
  ) {
    return this.stockService.adjustStock(user, dto);
  }

  @Patch('threshold')
  @RequirePermissions('inventory.write')
  setThreshold(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetLowStockThresholdDto,
  ) {
    return this.stockService.setLowStockThreshold(user.tenantId, dto);
  }
}
