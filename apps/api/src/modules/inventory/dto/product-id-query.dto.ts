import { IsString, MinLength } from 'class-validator';

export class ProductIdQueryDto {
  @IsString()
  @MinLength(1)
  productId: string;
}
