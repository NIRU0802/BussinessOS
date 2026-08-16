import {
  IsEnum,
  IsNumber,
  IsString,
  IsUUID,
  MinLength,
  NotEquals,
} from 'class-validator';

// 'sale_deduction' is deliberately excluded — that movement type is only
// ever created by the automatic order.paid listener, never via this
// manually-invoked endpoint.
export enum ManualStockMovementType {
  purchase = 'purchase',
  manual_adjustment = 'manual_adjustment',
  waste = 'waste',
}

export class AdjustStockDto {
  @IsUUID()
  branchId: string;

  @IsUUID()
  inventoryItemId: string;

  // Positive to add stock (e.g. purchase), negative to remove (e.g. waste
  // or a manual correction). Zero is rejected — it would create a
  // meaningless audit row.
  @IsNumber()
  @NotEquals(0)
  changeAmount: number;

  @IsEnum(ManualStockMovementType)
  movementType: ManualStockMovementType;

  @IsString()
  @MinLength(3)
  reason: string;
}
