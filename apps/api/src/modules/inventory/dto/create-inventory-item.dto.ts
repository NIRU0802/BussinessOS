import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateInventoryItemDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  unit: string;

  @IsNumber()
  @Min(0)
  costPerUnit: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
