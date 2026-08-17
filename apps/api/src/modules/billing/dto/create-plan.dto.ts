import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BillingCycle } from '@prisma/client';

export class PlanLimitDto {
  @IsOptional() @IsNumber() @Min(0) maxBranches?: number;
  @IsOptional() @IsNumber() @Min(0) maxUsers?: number;
  @IsOptional() @IsNumber() @Min(0) maxDevices?: number;
  @IsOptional() @IsNumber() @Min(0) maxStorageMb?: number;
  @IsOptional() @IsNumber() @Min(0) maxMonthlyOrders?: number;
}

export class CreatePlanDto {
  @IsString() name: string;

  @IsNumber() @Min(0) price: number;

  @IsEnum(BillingCycle) billingCycle: BillingCycle;

  @IsOptional() @IsString() description?: string;

  @IsOptional() @IsBoolean() isActive?: boolean;

  @IsOptional() @IsString() providerPlanId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlanLimitDto)
  limits?: PlanLimitDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  widgetKeys?: string[];
}
