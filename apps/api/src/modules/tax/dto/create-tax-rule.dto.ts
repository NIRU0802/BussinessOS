import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
class TaxComponentDto {
  @IsString()
  label: string;

  @IsNumber()
  rate: number;
}

export class CreateTaxRuleDto {
  @IsString()
  taxClassId: string;

  @IsString()
  country: string; // ISO alpha-2

  @IsOptional()
  @IsString()
  state?: string;

  @IsIn(['GST', 'VAT', 'SALES_TAX', 'NONE'])
  taxType: string;

  @ValidateNested({ each: true })
  @Type(() => TaxComponentDto)
  @ArrayMinSize(0)
  components: TaxComponentDto[];

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
