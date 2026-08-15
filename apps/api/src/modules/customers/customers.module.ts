import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { Customer360Service } from './customer-360.service';
import {
  BirthdayScanProcessor,
  BIRTHDAY_SCAN_QUEUE,
} from './jobs/birthday-scan.processor';
import { BirthdayReminderService } from './jobs/birthday-reminder.service';
import { BirthdayReminderListener } from './jobs/birthday-reminder.listener';

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
    BullModule.registerQueue({ name: BIRTHDAY_SCAN_QUEUE }),
  ],
  controllers: [CustomersController],
  providers: [
    CustomersService,
    Customer360Service,
    BirthdayScanProcessor,
    BirthdayReminderService,
    BirthdayReminderListener,
  ],
  exports: [CustomersService, Customer360Service],
})
export class CustomersModule {}
