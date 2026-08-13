import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { WebhookService, WEBHOOK_QUEUE } from '../webhook.service';

const MAX_ATTEMPTS = 6;

@Processor(WEBHOOK_QUEUE)
export class WebhookDeliveryProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookDeliveryProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookService: WebhookService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { eventId } = job.data;

    const event = await this.prisma.webhookEvent.findUnique({
      where: { id: eventId },
      include: { endpoint: true },
    });
    if (!event || !event.endpoint.url) return;

    const attemptNumber = event.attemptCount + 1;
    const signature = this.webhookService.signPayload(
      event.endpoint.secret,
      event.payload,
    );

    try {
      const response = await fetch(event.endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event.eventType,
        },
        body: JSON.stringify(event.payload),
      });

      const responseBody = await response.text();
      const success = response.status >= 200 && response.status < 300;

      await this.prisma.webhookDeliveryAttempt.create({
        data: {
          webhookEventId: event.id,
          attemptNumber,
          httpStatus: response.status,
          success,
          responseBody: responseBody.slice(0, 2000),
        },
      });

      if (success) {
        await this.prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: 'delivered',
            attemptCount: attemptNumber,
            lastAttemptAt: new Date(),
          },
        });
        return;
      }

      throw new Error(`Non-2xx response: ${response.status}`);
    } catch (err: any) {
      await this.prisma.webhookDeliveryAttempt.create({
        data: {
          webhookEventId: event.id,
          attemptNumber,
          success: false,
          errorMessage: err.message,
        },
      });

      const isFinalAttempt = attemptNumber >= MAX_ATTEMPTS;
      await this.prisma.webhookEvent.update({
        where: { id: event.id },
        data: {
          attemptCount: attemptNumber,
          lastAttemptAt: new Date(),
          status: isFinalAttempt ? 'dead_letter' : 'pending',
        },
      });

      if (isFinalAttempt) {
        this.logger.error(
          `Webhook ${event.id} moved to dead-letter after ${attemptNumber} attempts`,
        );
        return; // don't rethrow — BullMQ retry config is now exhausted anyway
      }

      throw err; // lets BullMQ apply exponential backoff for the next attempt
    }
  }
}
