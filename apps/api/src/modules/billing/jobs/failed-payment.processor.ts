import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { SubscriptionService } from '../subscription.service';
import { NotificationService } from '../../notification/notification.service';
// ADJUST: confirm this is your real recipient-lookup path for the tenant
// owner's contact info — needed to populate `recipient` below.
import { PrismaService } from '../../../prisma/prisma.service';

export interface FailedPaymentJobData {
  tenantId: string;
  subscriptionId: string;
  attemptNumber: number;
  failureReason?: string;
}

const MAX_REMINDER_ATTEMPTS = 3;

@Processor('billing-failed-payment')
export class FailedPaymentProcessor extends WorkerHost {
  private readonly logger = new Logger(FailedPaymentProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
    private readonly notificationService: NotificationService,
  ) {
    super();
  }

  async process(job: Job<FailedPaymentJobData>): Promise<void> {
    const { tenantId, subscriptionId, attemptNumber, failureReason } = job.data;
    this.logger.log(
      `Failed-payment reminder #${attemptNumber} for tenant ${tenantId}`,
    );

    // ADJUST: replace with the real owner-lookup query for this tenant
    // (e.g. tenant.ownerEmail or the Owner-role user's email/phone).
    const owner = await this.prisma.forTenant(tenantId, (tx) =>
      tx.user.findFirst({ where: { deletedAt: null } }),
    );

    if (owner) {
      await this.notificationService.send(tenantId, {
        channel: 'email',
        triggerType: 'security_alert',
        mode: 'auto_send',
        recipient: owner.email,
        subject: 'Payment failed for your Business OS subscription',
        body: `We were unable to process your subscription payment. Reason: ${failureReason ?? 'unknown'}. Please update your payment method to avoid service interruption.`,
        consentGated: false,
      } as any);
    }

    if (attemptNumber >= MAX_REMINDER_ATTEMPTS) {
      await this.subscriptionService.markPastDue(
        tenantId,
        subscriptionId,
        failureReason,
      );
      this.logger.warn(`Subscription ${subscriptionId} flagged past_due.`);
    }
  }
}
