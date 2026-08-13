export interface PaymentProviderResult {
  success: boolean;
  providerRef?: string;
  metadata?: Record<string, unknown>;
  errorMessage?: string;
}

export interface PaymentProvider {
  method: string; // "cash" | "card" | "upi" | "razorpay" | "stripe"
  /** Records/validates the payment. For cash/card/upi this is just a log — no gateway call. */
  charge(
    amount: number,
    currency: string,
    metadata?: Record<string, unknown>,
  ): Promise<PaymentProviderResult>;
  /** For future gateway adapters (Razorpay/Stripe); base methods return not-supported. */
  refund(
    providerRef: string | undefined,
    amount: number,
  ): Promise<PaymentProviderResult>;
}
