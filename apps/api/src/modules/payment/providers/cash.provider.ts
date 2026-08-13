import { Injectable } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentProviderResult,
} from '../interfaces/payment-provider.interface';

@Injectable()
export class CashProvider implements PaymentProvider {
  method = 'cash';

  async charge(amount: number): Promise<PaymentProviderResult> {
    // No gateway — cash handled physically at counter, we just log success.
    return {
      success: true,
      metadata: { note: 'Recorded manually by cashier' },
    };
  }

  async refund(
    _providerRef: string | undefined,
    _amount: number,
  ): Promise<PaymentProviderResult> {
    return {
      success: true,
      metadata: { note: 'Cash refund handled physically' },
    };
  }
}
