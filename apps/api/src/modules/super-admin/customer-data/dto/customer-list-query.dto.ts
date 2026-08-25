import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CustomerListQueryDto {
  @IsOptional()
  @IsString()
  search?: string; // matches customer name, phone, or email

  @IsOptional()
  @IsString()
  tenantId?: string; // filter to a single tenant/business

  @IsOptional()
  @IsString()
  businessType?: string; // filter by tenant's business category (cafe, restaurant, etc.) — wired up after Phase B

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
