import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import {
  OfferScanProcessor,
  OFFER_SCAN_QUEUE,
} from './jobs/offer-scan.processor';
import { OfferScanScheduler } from './jobs/offer-scan.scheduler';
import { OfferDispatchListener } from './jobs/offer-dispatch.listener';

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
    BullModule.registerQueue({ name: OFFER_SCAN_QUEUE }),
  ],
  controllers: [OffersController],
  providers: [
    OffersService,
    OfferScanProcessor,
    OfferScanScheduler,
    OfferDispatchListener,
  ],
  exports: [OffersService],
})
export class OffersModule {}
