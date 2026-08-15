import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  BIRTHDAY_SCAN_JOB,
  BIRTHDAY_SCAN_QUEUE,
} from './birthday-scan.processor';

const SCHEDULER_ID = 'birthday-scan-daily';

@Injectable()
export class BirthdayReminderService implements OnModuleInit {
  private readonly logger = new Logger(BirthdayReminderService.name);

  constructor(
    @InjectQueue(BIRTHDAY_SCAN_QUEUE) private readonly queue: Queue,
  ) {}

  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      SCHEDULER_ID,
      { pattern: '0 6 * * *' },
      {
        name: BIRTHDAY_SCAN_JOB,
        data: {},
        opts: {
          removeOnComplete: 50,
          removeOnFail: 50,
        },
      },
    );

    this.logger.log(
      `Registered daily birthday scan scheduler (cron: "0 6 * * *")`,
    );
  }

  async triggerNow() {
    return this.queue.add(`${BIRTHDAY_SCAN_JOB}-manual`, {});
  }
}
