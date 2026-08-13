import { IsEnum, IsNotEmpty, IsString, Length } from 'class-validator';
import { VoidRefundStatus } from '@prisma/client';

export class ApproveVoidRefundDto {
  // Only 'approved' or 'rejected' are valid decisions on this endpoint —
  // 'pending' is the initial state and cannot be set here.
  @IsEnum(VoidRefundStatus)
  decision: VoidRefundStatus;

  // Manager/Owner PIN re-entered at approval time, verified against
  // UserPin. Never trust role alone for this action.
  @IsString()
  @IsNotEmpty()
  @Length(4, 4)
  pin: string;
}
