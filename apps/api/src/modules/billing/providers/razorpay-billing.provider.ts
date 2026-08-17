import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import {
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
export class RazorpayBillingProvider implements IBillingProvider {
  readonly providerName = 'razorpay' as const;
  private readonly logger = new Logger(RazorpayBillingProvider.name);
  private readonly client: Razorpay;
  private readonly webhookSecret: string;

  constructor(private readonly config: ConfigService) {
    const keyId = this.config.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    this.webhookSecret =
      this.config.get<string>('RAZORPAY_WEBHOOK_SECRET') ?? '';

    if (!keyId || !keySecret) {
      this.logger.warn(
        'RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set — Razorpay billing provider will fail on use.',
      );
    }

    this.client = new Razorpay({
      key_id: keyId ?? '',
      key_secret: keySecret ?? '',
    });
  }

  async createCustomer(
    input: CreateBillingCustomerInput,
  ): Promise<CreateBillingCustomerResult> {
    const customer = await this.client.customers.create({
      name: input.name,
      email: input.email,
      notes: { tenantId: input.tenantId },
    });
    return { providerCustomerId: customer.id };
  }

  async createSubscription(
    input: CreateBillingSubscriptionInput,
  ): Promise<CreateBillingSubscriptionResult> {
    const subscription = await this.client.subscriptions.create({
      plan_id: input.providerPlanId,
      customer_notify: 1,
      total_count: 120, // 10 years of monthly cycles; provider auto-renews
      notes: { tenantId: input.tenantId },
    } as any);
    return { providerSubscriptionId: subscription.id };
  }

  async cancelSubscription(
    input: CancelBillingSubscriptionInput,
  ): Promise<void> {
    await this.client.subscriptions.cancel(input.providerSubscriptionId);
  }

  verifyWebhookSignature(input: VerifyWebhookSignatureInput): boolean {
    if (!this.webhookSecret) {
      this.logger.error(
        'RAZORPAY_WEBHOOK_SECRET not configured — rejecting webhook.',
      );
      return false;
    }
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(input.rawBody)
      .digest('hex');

    const expectedBuf = Buffer.from(expected, 'utf8');
    const givenBuf = Buffer.from(input.signatureHeader, 'utf8');

    if (expectedBuf.length !== givenBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, givenBuf);
  }

  parseWebhookEvent(rawBody: Buffer | string): NormalizedBillingEvent {
    const payload = JSON.parse(rawBody.toString());
    const eventName: string = payload.event;
    const subscriptionEntity = payload.payload?.subscription?.entity;
    const paymentEntity = payload.payload?.payment?.entity;

    if (eventName === 'subscription.charged') {
      return {
        type: 'payment_succeeded',
        providerSubscriptionId: subscriptionEntity?.id,
        providerPaymentId: paymentEntity?.id,
        amount: paymentEntity?.amount ? paymentEntity.amount / 100 : undefined,
      };
    }
    if (eventName === 'payment.failed') {
      return {
        type: 'payment_failed',
        providerSubscriptionId: subscriptionEntity?.id,
        providerPaymentId: paymentEntity?.id,
        failureReason: paymentEntity?.error_description,
      };
    }
    if (eventName === 'subscription.cancelled') {
      return {
        type: 'subscription_cancelled',
        providerSubscriptionId: subscriptionEntity?.id,
      };
    }

    throw new Error(`Unhandled Razorpay webhook event: ${eventName}`);
  }
}
