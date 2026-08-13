import { IsNumber, IsPositive, IsString } from 'class-validator';

export class RefundPaymentDto {
  @IsString()
  paymentRecordId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  reason: string;

  /**
   * Manager PIN/approval enforced upstream by a guard on this route
   * (e.g. RequirePermissions('PAYMENT_REFUND_APPROVE') restricted to
   * Owner/Manager roles) — approvedByUserId is taken from the
   * authenticated request, not the request body.
   */
}
