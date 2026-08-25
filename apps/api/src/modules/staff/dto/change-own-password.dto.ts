import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ChangeOwnPasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(10)
  @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one lowercase letter, one uppercase letter, and one number',
  })
  newPassword: string;
}
