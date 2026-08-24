import { IsIn, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class TenantListQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['active', 'suspended'])
  status?: 'active' | 'suspended';

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  pageSize?: number = 25;
}
