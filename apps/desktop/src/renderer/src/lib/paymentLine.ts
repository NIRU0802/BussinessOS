// Shared display-only line shape for anything downstream of order
// creation/resumption — PaymentScreen, ReceiptScreen, ResumeOrderScreen.
// Unlike CartLineItem (used while actively building a fresh order),
// this carries pre-computed unitPrice rather than the raw
// baseUnitPrice/variantPriceDelta/selectedModifiers[].priceDelta
// components, because a *resumed* order's existing items can't
// reconstruct those raw components (the server only stores the final
// unitPrice + a modifiers JSON blob, not separate variant/modifier
// price deltas per OrderItem row).
export interface PaymentLineItem {
  lineId: string
  name: string
  variantName: string | null
  modifierNames: string[]
  notes: string | null
  unitPrice: number
  quantity: number
}
