import {
  Injectable,
  Inject,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BILLING_PROVIDER } from './providers/billing-provider.interface';
import type {
  IBillingProvider,
  NormalizedBillingEvent,
} from './providers/billing-provider.interface';
import { InvoiceService } from './invoice.service';
import { SubscriptionService } from './subscription.service';
import { BILLING_EVENTS, PaymentFailedEvent } from './events/billing.events';

/**
 * Handles inbound webhooks from the active billing provider (Razorpay
 * or Stripe). Deliberately does NOT reuse the tenant-facing `webhook`
 * module â€” that module models per-tenant registered endpoints with
 * per-tenant secrets, which doesn't fit platform-level provider
 * webhooks (one global secret, tenant identified only after lookup).
 * Signature verification is handled by the active provider adapter.
 * Retry-on-failure is handled by the provider itself (Razorpay/Stripe
 * both retry on non-2xx responses) â€” no separate retry queue needed
 * here.
 */
@Injectable()
export class BillingWebhookHandlerService {
  private readonly logger = new Logger(BillingWebhookHandlerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(BILLING_PROVIDER)
    private readonly billingProvider: IBillingProvider,
    private readonly invoiceService: InvoiceService,
    private readonly subscriptionService: SubscriptionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handleIncomingWebhook(
    rawBody: Buffer,
    signatureHeader: string,
  ): Promise<void> {
    const isValid = this.billingProvider.verifyWebhookSignature({
      rawBody,
      signatureHeader,
    });
    if (!isValid) {
      this.logger.warn('Rejected billing webhook: invalid signature.');
      throw new UnauthorizedException('Invalid webhook signature.');
    }

    let event: NormalizedBillingEvent;
    try {
      event = this.billingProvider.parseWebhookEvent(rawBody);
    } catch (err) {
      this.logger.warn(`Unhandled/unparseable billing webhook: ${err.message}`);
      return;
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: { providerSubscriptionId: event.providerSubscriptionId },
    });

    if (!subscription) {
      this.logger.warn(
        `Billing webhook for unknown provider subscription: ${event.providerSubscriptionId}`,
      );
      return;
    }

    switch (event.type) {
      case 'payment_succeeded':
        await this.handlePaymentSucceeded(
          subscription.tenantId,
          subscription.id,
        );
        break;
      case 'payment_failed':
        await this.handlePaymentFailed(
          subscription.tenantId,
          subscription.id,
          event,
        );
        break;
      case 'subscription_cancelled':
        await this.subscriptionService.cancelSubscription(
          subscription.tenantId,
        );
        break;
    }
  }

  private async handlePaymentSucceeded(
    tenantId: string,
    subscriptionId: string,
  ) {
    const openInvoice = await this.prisma.forTenant(tenantId, (tx) =>
      tx.invoice.findFirst({
        where: {
          subscriptionId,
          status: { in: ['draft', 'issued', 'failed'] },
        },
        orderBy: { issuedAt: 'desc' },
      }),
    );
    if (openInvoice) {
      await this.invoiceService.markPaid(tenantId, openInvoice.id);
    }
    await this.prisma.forTenant(tenantId, (tx) =>
      tx.subscription.update({
        where: { id: subscriptionId },
        data: { status: 'active' },
      }),
    );
    this.eventEmitter.emit(BILLING_EVENTS.PAYMENT_SUCCEEDED, {
      tenantId,
      subscriptionId,
    });
  }

  private async handlePaymentFailed(
    tenantId: string,
    subscriptionId: string,
    event: NormalizedBillingEvent,
  ) {
    const openInvoice = await this.prisma.forTenant(tenantId, (tx) =>
      tx.invoice.findFirst({
        where: { subscriptionId, status: { in: ['draft', 'issued'] } },
        orderBy: { issuedAt: 'desc' },
      }),
    );
    if (openInvoice) {
      await this.invoiceService.markFailed(tenantId, openInvoice.id);
    }
    this.eventEmitter.emit(
      BILLING_EVENTS.PAYMENT_FAILED,
      new PaymentFailedEvent(tenantId, subscriptionId, 1, event.failureReason),
    );
  }
}
