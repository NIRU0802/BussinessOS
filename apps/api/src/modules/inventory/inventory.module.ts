import { Module } from '@nestjs/common';
import { InventoryItemsController } from './inventory-items.controller';
import { InventoryItemsService } from './inventory-items.service';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { ProductIngredientsController } from './product-ingredients.controller';
import { ProductIngredientsService } from './product-ingredients.service';
import { OrderPaidStockDeductionListener } from './listeners/order-paid-stock-deduction.listener';
import { LowStockAlertListener } from './listeners/low-stock-alert.listener';
import { WidgetsModule } from '../widgets/widgets.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [WidgetsModule, AuditLogModule, NotificationModule],
  controllers: [
    InventoryItemsController,
    StockController,
    ProductIngredientsController,
  ],
  providers: [
    InventoryItemsService,
    StockService,
    ProductIngredientsService,
    OrderPaidStockDeductionListener,
    LowStockAlertListener,
  ],
  exports: [StockService],
})
export class InventoryModule {}
