import { IsBoolean, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class SetBranchOverrideDto {
  @IsUUID()
  branchId: string;

  @IsUUID()
  menuItemId: string;

  // null explicitly clears the override (falls back to base price)
  @IsOptional()
  @IsNumber()
  priceOverride?: number | null;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;
}
