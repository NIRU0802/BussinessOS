import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ListReservationsQueryDto {
  @IsUUID()
  branchId: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
