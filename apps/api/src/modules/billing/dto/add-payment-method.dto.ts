import { IsEnum, IsString, IsOptional, IsBoolean } from 'class-validator';
import { BillingProviderType } from '@prisma/client';

export class AddPaymentMethodDto {
  @IsEnum(BillingProviderType)
  provider: BillingProviderType;

  @IsString()
  providerToken: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
