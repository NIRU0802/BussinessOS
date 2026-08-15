import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export class SetBranchOverrideDto {
  @IsUUID()
  branchId: string;

  @IsUUID()
  menuItemId: string;

  // null explicitly clears the override (falls back to base price)
  @IsOptional()
  @IsNumber()
  priceOverride?: number | null;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;

  // Branch-level day/time window override. Empty array or omitted = falls
  // back to the master MenuItem's window (handled in EffectiveMenuService).
  @IsOptional()
  @IsArray()
  @IsIn(WEEKDAYS, { each: true })
  availableDays?: string[];

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
