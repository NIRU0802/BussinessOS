import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { OfferSegment, OfferTriggerType } from '@prisma/client';

export class CreateOfferDto {
  @IsString()
  @MaxLength(150)
  title!: string;

  /**
   * Supports {{customerName}} and {{offerTitle}} placeholders, replaced
   * at prepare-message time — same pattern as the birthday message.
   */
  @IsString()
  @MaxLength(1000)
  messageTemplate!: string;

  @IsEnum(OfferTriggerType)
  triggerType!: OfferTriggerType;

  @IsOptional()
  @IsEnum(OfferSegment)
  segment?: OfferSegment;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  recurringMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  recurringDay?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  inactivityDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
