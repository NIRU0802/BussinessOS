import {
  IsString,
  IsNumber,
  IsIn,
  IsOptional,
  IsInt,
  Min,
  IsArray,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  name: string;

  @IsNumber()
  price: number;

  @IsIn(['monthly', 'yearly'])
  billingCycle: 'monthly' | 'yearly';

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxBranches?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxUsers?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxDevices?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxStorageMb?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxMonthlyOrders?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  widgetKeys?: string[];
}
