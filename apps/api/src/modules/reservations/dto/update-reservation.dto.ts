import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const RESERVATION_STATUSES = [
  'pending',
  'confirmed',
  'seated',
  'completed',
  'cancelled',
  'no_show',
] as const;

export class UpdateReservationDto {
  @IsOptional()
  @IsUUID()
  tableId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  customerPhone?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  partySize?: number;

  @IsOptional()
  @IsDateString()
  reservedFor?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes?: number;

  @IsOptional()
  @IsIn(RESERVATION_STATUSES)
  status?: (typeof RESERVATION_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
