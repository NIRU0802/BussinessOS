export interface CreateBillingCustomerInput {
  tenantId: string;
  email: string;
  name: string;
}

export interface CreateBillingCustomerResult {
  providerCustomerId: string;
}

export interface CreateBillingSubscriptionInput {
  providerCustomerId: string;
  providerPlanId: string;
  tenantId: string;
}

export interface CreateBillingSubscriptionResult {
  providerSubscriptionId: string;
}

export interface CancelBillingSubscriptionInput {
  providerSubscriptionId: string;
}

export interface ChargeResult {
  success: boolean;
  providerPaymentId?: string;
  failureReason?: string;
}

export interface VerifyWebhookSignatureInput {
  rawBody: Buffer | string;
  signatureHeader: string;
}

/**
 * Every recurring billing provider (Razorpay, Stripe, future providers)
 * must implement this interface. Core billing logic depends only on this
 * interface — never on a concrete provider — so a new provider can be
 * added without touching subscription/invoice/usage-tracking logic.
 */
export interface IBillingProvider {
  readonly providerName: 'razorpay' | 'stripe';

  createCustomer(
    input: CreateBillingCustomerInput,
  ): Promise<CreateBillingCustomerResult>;

  createSubscription(
    input: CreateBillingSubscriptionInput,
  ): Promise<CreateBillingSubscriptionResult>;

  cancelSubscription(input: CancelBillingSubscriptionInput): Promise<void>;

  verifyWebhookSignature(input: VerifyWebhookSignatureInput): boolean;

  /**
   * Parses a raw provider webhook payload into a normalized event.
   * Normalized so billing-webhook-handler.service.ts never needs to
   * know which provider sent the event.
   */
  parseWebhookEvent(rawBody: Buffer | string): NormalizedBillingEvent;
}

export type NormalizedBillingEventType =
  'payment_succeeded' | 'payment_failed' | 'subscription_cancelled';

export interface NormalizedBillingEvent {
  type: NormalizedBillingEventType;
  providerSubscriptionId: string;
  providerPaymentId?: string;
  amount?: number;
  failureReason?: string;
}

export const BILLING_PROVIDER = 'BILLING_PROVIDER';
