import { IsString, Length, Matches } from 'class-validator';

export class SetPinDto {
  // Current full-login session sets/changes their own PIN.
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits.' })
  pin: string;
}
