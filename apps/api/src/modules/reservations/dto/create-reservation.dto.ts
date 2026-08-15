import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReservationDto {
  @IsOptional()
  @IsUUID()
  tableId?: string;

  @IsString()
  @MaxLength(150)
  customerName: string;

  @IsString()
  @MaxLength(30)
  customerPhone: string;

  @IsInt()
  @Min(1)
  @Max(100)
  partySize: number;

  @IsDateString()
  reservedFor: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
