import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTaxClassDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
