import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum RoleNameDto {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  CHEF = 'CHEF',
  KITCHEN_STAFF = 'KITCHEN_STAFF',
  WAREHOUSE = 'WAREHOUSE',
  ACCOUNTANT = 'ACCOUNTANT',
  DELIVERY_RIDER = 'DELIVERY_RIDER',
  CUSTOMER = 'CUSTOMER',
}

export class CreateRoleDto {
  @IsEnum(RoleNameDto)
  name: RoleNameDto;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  permissionKeys: string[];
}
