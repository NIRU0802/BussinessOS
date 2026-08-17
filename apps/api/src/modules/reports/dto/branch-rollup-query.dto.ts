import {
  IsDateString,
  IsOptional,
  IsArray,
  IsUUID,
  ArrayMaxSize,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class BranchRollupQueryDto {
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
}
