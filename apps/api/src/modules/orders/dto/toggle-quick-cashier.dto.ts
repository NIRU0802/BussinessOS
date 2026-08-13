import { IsBoolean, IsUUID } from 'class-validator';

export class ToggleQuickCashierDto {
  @IsUUID()
  branchId: string;

  @IsBoolean()
  enabled: boolean;
}
