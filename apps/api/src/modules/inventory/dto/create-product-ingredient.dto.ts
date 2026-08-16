import { IsNumber, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateProductIngredientDto {
  // Not IsUUID: productId points at MenuItem.id today, but is stored as an
  // unenforced string (see schema note) — same latitude OrderItem.productId
  // already has, so we validate shape, not FK existence.
  @IsString()
  @MinLength(1)
  productId: string;

  @IsUUID()
  inventoryItemId: string;

  @IsNumber()
  @Min(0.001)
  quantityUsed: number;
}
