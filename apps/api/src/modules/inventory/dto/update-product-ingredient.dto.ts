import { IsNumber, Min } from 'class-validator';

export class UpdateProductIngredientDto {
  @IsNumber()
  @Min(0.001)
  quantityUsed: number;
}
