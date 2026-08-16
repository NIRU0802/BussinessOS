import { IsNumber, IsUUID, Min } from 'class-validator';

export class SetLowStockThresholdDto {
  @IsUUID()
  branchId: string;

  @IsUUID()
  inventoryItemId: string;

  @IsNumber()
  @Min(0)
  lowStockThreshold: number;
}
