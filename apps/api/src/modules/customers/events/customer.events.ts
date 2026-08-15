import { Customer } from '@prisma/client';

/**
 * Domain event name constants for the Customers module.
 * Follows the ORDER_EVENTS convention established in Phase 3/4.
 */
export const CUSTOMER_EVENTS = {
  CREATED: 'customer.created',
  UPDATED: 'customer.updated',
  BIRTHDAY_UPCOMING: 'customer.birthday_upcoming',
} as const;

export type CustomerEventName =
  (typeof CUSTOMER_EVENTS)[keyof typeof CUSTOMER_EVENTS];

/** Lightweight ID-only payload emitted on customer creation. */
export interface CustomerCreatedEvent {
  tenantId: string;
  customerId: string;
}

/** Lightweight ID-only payload emitted on customer update. */
export interface CustomerUpdatedEvent {
  tenantId: string;
  customerId: string;
}

/**
 * Emitted by the birthday scan job for each customer whose birthday falls
 * in exactly N days. Architected as a domain event (rather than a direct
 * notification call) so that a future WhatsApp Business API auto-send
 * integration can subscribe to this same event without any restructuring
 * of the scan/detection logic.
 */
export interface CustomerBirthdayUpcomingEvent {
  tenantId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  daysUntilBirthday: number;
  birthdayDate: string; // ISO date (yyyy-mm-dd), year-normalized to upcoming occurrence
}
