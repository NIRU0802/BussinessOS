import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { OFFER_SCAN_JOB, OFFER_SCAN_QUEUE } from './offer-scan.processor';

const SCHEDULER_ID = 'offer-scan-daily';

@Injectable()
export class OfferScanScheduler implements OnModuleInit {
  private readonly logger = new Logger(OfferScanScheduler.name);

  constructor(@InjectQueue(OFFER_SCAN_QUEUE) private readonly queue: Queue) {}

  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      SCHEDULER_ID,
      { pattern: '15 6 * * *' },
      {
        name: OFFER_SCAN_JOB,
        data: {},
        opts: {
          removeOnComplete: 50,
          removeOnFail: 50,
        },
      },
    );

    this.logger.log(
      `Registered daily offer scan scheduler (cron: "15 6 * * *")`,
    );
  }
}
