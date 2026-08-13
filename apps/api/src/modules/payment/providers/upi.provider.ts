import { Injectable } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentProviderResult,
} from '../interfaces/payment-provider.interface';

@Injectable()
export class UpiProvider implements PaymentProvider {
  method = 'upi';

  /**
   * No payment gateway integration — per spec, UPI is recorded as
   * method + status only (e.g. cashier confirms UPI received on their
   * own UPI app/QR). Zero cost, zero third-party dependency.
   */
  async charge(
    amount: number,
    currency: string,
    metadata?: Record<string, unknown>,
  ): Promise<PaymentProviderResult> {
    return {
      success: true,
      metadata: { ...metadata, note: 'Recorded manually, no gateway' },
    };
  }

  async refund(): Promise<PaymentProviderResult> {
    return { success: true, metadata: { note: 'Manual UPI refund recorded' } };
  }
}
