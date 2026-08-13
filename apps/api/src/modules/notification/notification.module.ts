import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import {
  NotificationService,
  NOTIFICATION_QUEUE,
} from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationProcessor } from './processors/notification.processor';
import { TwilioSmsProvider } from './providers/twilio-sms.provider';
import { TwilioWhatsappProvider } from './providers/twilio-whatsapp.provider';
import { SendgridEmailProvider } from './providers/sendgrid-email.provider';

@Module({
  imports: [BullModule.registerQueue({ name: NOTIFICATION_QUEUE })],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationProcessor,
    TwilioSmsProvider,
    TwilioWhatsappProvider,
    SendgridEmailProvider,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
