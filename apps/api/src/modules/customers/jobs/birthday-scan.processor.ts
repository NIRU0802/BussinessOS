import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CUSTOMER_EVENTS,
  CustomerBirthdayUpcomingEvent,
} from '../events/customer.events';

export const BIRTHDAY_SCAN_QUEUE = 'birthday-scan';
export const BIRTHDAY_SCAN_JOB = 'daily-birthday-scan';

const DAYS_AHEAD = 7;

/**
 * BullMQ worker that runs the daily birthday scan. Registered as a
 * repeatable job by BirthdayReminderService. For every tenant, finds
 * customers whose birthday (month/day, year-agnostic) falls exactly
 * DAYS_AHEAD days from today, and emits CUSTOMER_EVENTS.BIRTHDAY_UPCOMING
 * for each — never sends anything to the customer directly.
 */
@Injectable()
@Processor(BIRTHDAY_SCAN_QUEUE)
export class BirthdayScanProcessor extends WorkerHost {
  private readonly logger = new Logger(BirthdayScanProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(
    job: Job,
  ): Promise<{ tenantsScanned: number; matchesFound: number }> {
    this.logger.log(`Starting birthday scan job ${job.id}`);

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + DAYS_AHEAD);
    const targetMonth = targetDate.getMonth() + 1; // 1-12
    const targetDay = targetDate.getDate();

    // System-context read across all tenants: this scan intentionally runs
    // outside per-request tenant context, so we use the raw PrismaService
    // client directly (read-only) rather than forTenant/forCurrentTenant.
    const tenants = await this.prisma.tenant.findMany({
      select: { id: true },
    });

    let matchesFound = 0;

    for (const tenant of tenants) {
      const customers = await this.prisma.customer.findMany({
        where: {
          tenantId: tenant.id,
          dob: { not: null },
        },
        select: { id: true, name: true, phone: true, dob: true },
      });

      const matches = customers.filter((c) => {
        if (!c.dob) return false;
        const dob = new Date(c.dob);
        return (
          dob.getMonth() + 1 === targetMonth && dob.getDate() === targetDay
        );
      });

      for (const customer of matches) {
        matchesFound += 1;

        const birthdayIso = `${targetDate.getFullYear()}-${String(
          targetMonth,
        ).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;

        this.eventEmitter.emit(CUSTOMER_EVENTS.BIRTHDAY_UPCOMING, {
          tenantId: tenant.id,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          daysUntilBirthday: DAYS_AHEAD,
          birthdayDate: birthdayIso,
        } satisfies CustomerBirthdayUpcomingEvent);
      }
    }

    this.logger.log(
      `Birthday scan complete: ${tenants.length} tenants scanned, ${matchesFound} matches found`,
    );

    return { tenantsScanned: tenants.length, matchesFound };
  }
}
