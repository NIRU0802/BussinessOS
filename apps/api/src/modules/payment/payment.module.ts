import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { CashProvider } from './providers/cash.provider';
import { CardProvider } from './providers/card.provider';
import { UpiProvider } from './providers/upi.provider';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, CashProvider, CardProvider, UpiProvider],
  exports: [PaymentService],
})
export class PaymentModule {}
