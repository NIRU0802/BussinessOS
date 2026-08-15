export const OFFER_EVENTS = {
  DISPATCH_READY: 'offer.dispatch_ready',
} as const;

export type OfferEventName = (typeof OFFER_EVENTS)[keyof typeof OFFER_EVENTS];

export interface OfferDispatchReadyEvent {
  tenantId: string;
  offerId: string;
  offerTitle: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  messagePreview: string;
}
