import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class VariantInputDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsNumber()
  priceDelta: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export class CreateMenuItemDto {
  @IsUUID()
  categoryId: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsOptional()
  @IsBoolean()
  isVegetarian?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  // Optional inline variant creation at item-creation time.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => VariantInputDto)
  variants?: VariantInputDto[];

  // Existing modifier group ids to attach to this item.
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  modifierGroupIds?: string[];

  // Phase 5 additions -----------------------------------------------------

  @IsOptional()
  @IsUUID()
  taxClassId?: string;

  // Empty array or omitted = available every day (no restriction).
  @IsOptional()
  @IsArray()
  @IsIn(WEEKDAYS, { each: true })
  availableDays?: string[];

  // 24h "HH:mm" format, e.g. "09:00". Null/omitted = no time restriction.
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'availableFromTime must be in HH:mm 24-hour format',
  })
  availableFromTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'availableToTime must be in HH:mm 24-hour format',
  })
  availableToTime?: string;
}
