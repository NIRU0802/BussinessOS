import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ArrayMaxSize,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ReportPeriod } from '../enums/report-period.enum';

export class SalesSummaryQueryDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsEnum(ReportPeriod)
  period!: ReportPeriod;

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
  @IsString()
  channel?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  groupByChannel?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  groupByBranch?: boolean;
}
