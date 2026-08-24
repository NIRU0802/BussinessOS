import { IsOptional, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class AuditLogQueryDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  superAdminId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  pageSize?: number = 50;
}
