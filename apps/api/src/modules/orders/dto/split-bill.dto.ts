import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export enum SplitMode {
  BY_ITEM = 'by_item',
  EQUAL_SHARE = 'equal_share',
}

export class SplitPaymentShareDto {
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  // Required for BY_ITEM mode: the OrderItem ids this share pays for.
  // Ignored for EQUAL_SHARE mode (amount is computed instead).
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  itemIds?: string[];

  // Required for EQUAL_SHARE mode: this share's amount as a decimal string.
  // Ignored for BY_ITEM mode (amount is computed from itemIds).
  @IsOptional()
  @IsString()
  amount?: string;

  @IsOptional()
  @IsString()
  paidByCustomerRef?: string;
}

export class SplitBillDto {
  @IsEnum(SplitMode)
  mode: SplitMode;

  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SplitPaymentShareDto)
  shares: SplitPaymentShareDto[];
}
