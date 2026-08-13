import { IsString, IsUUID, Length, Matches } from 'class-validator';

export class QuickLoginDto {
  @IsUUID()
  branchId: string;

  @IsUUID()
  userId: string;

  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits.' })
  pin: string;
}
