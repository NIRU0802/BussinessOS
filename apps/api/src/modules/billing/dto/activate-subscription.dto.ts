import { IsEnum, IsString, IsEmail } from 'class-validator';
import { BillingProviderType } from '@prisma/client';

export class ActivateSubscriptionDto {
  @IsEnum(BillingProviderType)
  provider: BillingProviderType;

  /** Token/payment method reference already collected client-side
   * (e.g. via Razorpay Checkout or Stripe Elements) that authorizes
   * creating a customer + subscription. Never a raw card number. */
  @IsString()
  providerToken: string;

  @IsEmail()
  billingEmail: string;

  @IsString()
  billingName: string;
}
