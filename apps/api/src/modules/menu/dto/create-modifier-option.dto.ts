import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateModifierOptionDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsNumber()
  priceDelta?: number;
}
