import { Injectable } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentProviderResult,
} from '../interfaces/payment-provider.interface';

@Injectable()
export class CardProvider implements PaymentProvider {
  method = 'card';

  /** Card handled entirely by an external physical card machine; we only log it here. */
  async charge(
    amount: number,
    currency: string,
    metadata?: Record<string, unknown>,
  ): Promise<PaymentProviderResult> {
    return {
      success: true,
      metadata: { ...metadata, note: 'Handled by external card machine' },
    };
  }

  async refund(): Promise<PaymentProviderResult> {
    return {
      success: true,
      metadata: { note: 'Refund processed on external card machine' },
    };
  }
}
