import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhookService, WEBHOOK_QUEUE } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { WebhookDeliveryProcessor } from './processors/webhook-delivery.processor';

@Module({
  imports: [BullModule.registerQueue({ name: WEBHOOK_QUEUE })],
  controllers: [WebhookController],
  providers: [WebhookService, WebhookDeliveryProcessor],
  exports: [WebhookService],
})
export class WebhookModule {}
