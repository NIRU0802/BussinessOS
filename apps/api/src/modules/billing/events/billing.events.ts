export const BILLING_EVENTS = {
  SUBSCRIPTION_CREATED: 'billing.subscription.created',
  SUBSCRIPTION_PLAN_CHANGED: 'billing.subscription.plan_changed',
  SUBSCRIPTION_CANCELLED: 'billing.subscription.cancelled',
  SUBSCRIPTION_PAST_DUE: 'billing.subscription.past_due',
  PAYMENT_SUCCEEDED: 'billing.payment.succeeded',
  PAYMENT_FAILED: 'billing.payment.failed',
  INVOICE_ISSUED: 'billing.invoice.issued',
  INVOICE_PAID: 'billing.invoice.paid',
} as const;

export class SubscriptionPastDueEvent {
  constructor(
    public readonly tenantId: string,
    public readonly subscriptionId: string,
    public readonly failureReason?: string,
  ) {}
}

export class PaymentFailedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly subscriptionId: string,
    public readonly attemptNumber: number,
    public readonly failureReason?: string,
  ) {}
}

export class InvoiceIssuedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly invoiceId: string,
  ) {}
}
