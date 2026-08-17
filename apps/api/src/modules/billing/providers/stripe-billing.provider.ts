import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import type {
  IBillingProvider,
  CreateBillingCustomerInput,
  CreateBillingCustomerResult,
  CreateBillingSubscriptionInput,
  CreateBillingSubscriptionResult,
  CancelBillingSubscriptionInput,
  VerifyWebhookSignatureInput,
  NormalizedBillingEvent,
} from './billing-provider.interface';

@Injectable()
export class StripeBillingProvider implements IBillingProvider {
  readonly providerName = 'stripe' as const;
  private readonly logger = new Logger(StripeBillingProvider.name);
  private readonly client: Stripe;
  private readonly webhookSecret: string;

  constructor(private readonly config: ConfigService) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    this.webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';

    if (!secretKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY not set — Stripe billing provider will fail on use.',
      );
    }

    this.client = new Stripe(secretKey ?? '', {
      apiVersion: '2026-07-29.dahlia',
    });
  }

  async createCustomer(
    input: CreateBillingCustomerInput,
  ): Promise<CreateBillingCustomerResult> {
    const customer = await this.client.customers.create({
      name: input.name,
      email: input.email,
      metadata: { tenantId: input.tenantId },
    });
    return { providerCustomerId: customer.id };
  }

  async createSubscription(
    input: CreateBillingSubscriptionInput,
  ): Promise<CreateBillingSubscriptionResult> {
    const subscription = await this.client.subscriptions.create({
      customer: input.providerCustomerId,
      items: [{ price: input.providerPlanId }],
      metadata: { tenantId: input.tenantId },
    });
    return { providerSubscriptionId: subscription.id };
  }

  async cancelSubscription(
    input: CancelBillingSubscriptionInput,
  ): Promise<void> {
    await this.client.subscriptions.cancel(input.providerSubscriptionId);
  }

  verifyWebhookSignature(input: VerifyWebhookSignatureInput): boolean {
    try {
      this.client.webhooks.constructEvent(
        input.rawBody,
        input.signatureHeader,
        this.webhookSecret,
      );
      return true;
    } catch (err) {
      this.logger.error(
        `Stripe webhook signature verification failed: ${err.message}`,
      );
      return false;
    }
  }

  parseWebhookEvent(rawBody: Buffer | string): NormalizedBillingEvent {
    const event = JSON.parse(rawBody.toString()) as Stripe.Event;

    if (event.type === 'invoice.payment_succeeded') {
      // Cast to a loose shape rather than Stripe.Invoice: the installed
      // SDK's strict type for this API version doesn't expose
      // `subscription`/`payment_intent` directly on Invoice, but the
      // raw webhook JSON payload does include them for subscription
      // invoices.
      const invoice = event.data.object as unknown as {
        subscription?: string;
        payment_intent?: string;
        amount_paid?: number;
      };
      return {
        type: 'payment_succeeded',
        providerSubscriptionId: invoice.subscription ?? '',
        providerPaymentId: invoice.payment_intent ?? undefined,
        amount: invoice.amount_paid ? invoice.amount_paid / 100 : undefined,
      };
    }
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as unknown as { subscription?: string };
      return {
        type: 'payment_failed',
        providerSubscriptionId: invoice.subscription ?? '',
        failureReason: 'Stripe invoice payment failed',
      };
    }
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      return {
        type: 'subscription_cancelled',
        providerSubscriptionId: sub.id,
      };
    }

    throw new Error(`Unhandled Stripe webhook event: ${event.type}`);
  }
}
