import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCustomerAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;

  @IsString()
  @MaxLength(300)
  line1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  line2?: string;

  @IsString()
  @MaxLength(100)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
