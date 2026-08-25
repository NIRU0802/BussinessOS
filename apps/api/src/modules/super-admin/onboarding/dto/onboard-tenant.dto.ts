import {
  IsString,
  MinLength,
  MaxLength,
  IsEmail,
  IsOptional,
  IsUUID,
  IsIn,
  Matches,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BUSINESS_TYPE_PRESET_KEYS } from '../../../widgets/presets/business-type-presets';

const NON_OWNER_ROLE_NAMES = [
  'MANAGER',
  'CASHIER',
  'CHEF',
  'KITCHEN_STAFF',
  'WAREHOUSE',
  'ACCOUNTANT',
  'DELIVERY_RIDER',
  'CUSTOMER',
];

export class OnboardingOwnerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(10)
  @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one lowercase letter, one uppercase letter, and one number',
  })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}

export class OnboardingAdditionalUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsIn(NON_OWNER_ROLE_NAMES)
  roleName: string;
}

export class CustomPlanDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  price: string;

  @IsIn(['monthly', 'yearly'])
  billingCycle: string;
}

export class OnboardTenantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  tenantName: string;

  @IsIn(BUSINESS_TYPE_PRESET_KEYS)
  businessType: string;

  @IsOptional()
  @IsUUID()
  planId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomPlanDto)
  customPlan?: CustomPlanDto;

  @ValidateNested()
  @Type(() => OnboardingOwnerDto)
  owner: OnboardingOwnerDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnboardingAdditionalUserDto)
  additionalUsers?: OnboardingAdditionalUserDto[];
}
