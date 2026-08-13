import {
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class RecordPaymentDto {
  @IsString()
  branchId: string;

  @IsString()
  orderId: string;

  @IsIn(['cash', 'card', 'upi', 'razorpay', 'stripe'])
  method: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
