import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { FailedPaymentJobData } from './failed-payment.processor';

const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

@Injectable()
export class FailedPaymentScheduler {
  constructor(
    @InjectQueue('billing-failed-payment') private readonly queue: Queue,
  ) {}

  async scheduleReminder(
    data: FailedPaymentJobData,
    delayMs = 0,
  ): Promise<void> {
    const schedulerId = `failed-payment:${data.subscriptionId}:${data.attemptNumber}`;

    // BullMQ v6's JobSchedulerTemplateOptions has no `delay` field —
    // the scheduler's own `startDate` controls timing for a one-off
    // job instead. `startDate` accepts a Date or epoch ms.
    await this.queue.upsertJobScheduler(
      schedulerId,
      {
        every: 0,
        immediately: delayMs === 0,
        startDate: delayMs > 0 ? new Date(Date.now() + delayMs) : undefined,
      },
      {
        name: 'process-failed-payment',
        data,
      },
    );
  }

  async startGracePeriodFlow(data: FailedPaymentJobData): Promise<void> {
    await this.scheduleReminder({ ...data, attemptNumber: 1 }, 0);
    await this.scheduleReminder(
      { ...data, attemptNumber: 2 },
      Math.floor(GRACE_PERIOD_MS / 2),
    );
    await this.scheduleReminder({ ...data, attemptNumber: 3 }, GRACE_PERIOD_MS);
  }
}
