import {
  IsDateString,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'phone must be a valid E.164-style phone number',
  })
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsDateString()
  dob?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsObject()
  preferences?: Record<string, unknown>;
}
