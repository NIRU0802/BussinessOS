import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BILLING_PROVIDER,
  IBillingProvider,
} from './billing-provider.interface';
import { RazorpayBillingProvider } from './razorpay-billing.provider';
import { StripeBillingProvider } from './stripe-billing.provider';

/**
 * Selects the active billing provider from env config
 * (BILLING_PROVIDER=razorpay|stripe). Adding a third provider means:
 * 1. implement IBillingProvider, 2. add a branch here. Nothing else
 * in the billing module changes.
 */
export const billingProviderFactory: FactoryProvider<IBillingProvider> = {
  provide: BILLING_PROVIDER,
  useFactory: (
    config: ConfigService,
    razorpay: RazorpayBillingProvider,
    stripe: StripeBillingProvider,
  ) => {
    const selected = config.get<string>('BILLING_PROVIDER', 'razorpay');
    if (selected === 'stripe') return stripe;
    return razorpay;
  },
  inject: [ConfigService, RazorpayBillingProvider, StripeBillingProvider],
};
