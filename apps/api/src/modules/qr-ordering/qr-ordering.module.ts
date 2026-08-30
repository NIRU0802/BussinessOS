import { Module } from '@nestjs/common';

import { CustomersModule } from '../customers/customers.module';
import { MenuModule } from '../menu/menu.module';
import { OrdersModule } from '../orders/orders.module';
import { TablesModule } from '../tables/tables.module';

import { QrOrderingController } from './qr-ordering.controller';
import { QrOrderingService } from './qr-ordering.service';

@Module({
  imports: [CustomersModule, MenuModule, OrdersModule, TablesModule],
  controllers: [QrOrderingController],
  providers: [QrOrderingService],
})
export class QrOrderingModule {}
