import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ArrayMaxSize,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { BestSellerSortBy } from '../enums/report-period.enum';

export class BestSellersQueryDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(',')
        : value,
  )
  branchIds?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(BestSellerSortBy)
  sortBy?: BestSellerSortBy = BestSellerSortBy.QUANTITY;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  groupByBranch?: boolean;
}
