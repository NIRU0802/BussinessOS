import { Module } from '@nestjs/common';
import { QrOrderingService } from './qr-ordering.service';
import { QrOrderingController } from './qr-ordering.controller';
import { TablesModule } from '../tables/tables.module';
import { MenuModule } from '../menu/menu.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [TablesModule, MenuModule, OrdersModule],
  controllers: [QrOrderingController],
  providers: [QrOrderingService],
})
export class QrOrderingModule {}
