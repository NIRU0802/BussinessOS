import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { OffersService } from '../offers.service';
import { TenantContextService } from '../../../common/tenant-context/tenant-context.service';

export const OFFER_SCAN_QUEUE = 'offer-scan';
export const OFFER_SCAN_JOB = 'daily-offer-scan';

@Injectable()
@Processor(OFFER_SCAN_QUEUE)
export class OfferScanProcessor extends WorkerHost {
  private readonly logger = new Logger(OfferScanProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly offersService: OffersService,
    private readonly tenantContext: TenantContextService,
  ) {
    super();
  }

  async process(job: Job) {
    this.logger.log(`Starting offer scan job ${job.id}`);
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
    let totalTriggered = 0;

    for (const tenant of tenants) {
      const offers = await this.prisma.offer.findMany({
        where: {
          tenantId: tenant.id,
          isActive: true,
          triggerType: { in: ['SCHEDULED', 'RECURRING_DATE', 'INACTIVITY'] },
        },
      });

      for (const offer of offers) {
        const shouldFire =
          (offer.triggerType === 'SCHEDULED' &&
            offer.scheduledFor &&
            isSameDay(offer.scheduledFor, now)) ||
          (offer.triggerType === 'RECURRING_DATE' &&
            offer.recurringMonth === month &&
            offer.recurringDay === day) ||
          offer.triggerType === 'INACTIVITY';

        if (!shouldFire) continue;

        await this.tenantContext.run(
          {
            tenantId: tenant.id,
            userId: 'system-scheduler',
            branchIds: [],
            isAllBranches: true,
            roles: [],
            permissions: [],
          },
          async () => {
            const result = await this.offersService.triggerNow(offer.id);
            totalTriggered += result.matched;
          },
        );
      }
    }

    this.logger.log(
      `Offer scan complete: ${totalTriggered} dispatches created`,
    );
    return { totalTriggered };
  }
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
