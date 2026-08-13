import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { VoidRefundType } from '@prisma/client';

export class VoidRefundRequestDto {
  @IsEnum(VoidRefundType)
  type: VoidRefundType;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  reason: string;
}
