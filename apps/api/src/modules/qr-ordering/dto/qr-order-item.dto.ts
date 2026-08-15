import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class QrOrderItemDto {
  // No price fields accepted from the client — prices are always resolved
  // server-side from the effective branch menu. This is deliberate: an
  // anonymous internet-facing customer must never be able to influence
  // what they're charged.
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  modifierOptionIds?: string[];

  @IsInt()
  @Min(1)
  @Max(50)
  quantity: number;
}

export class QrCreateOrderDto {
  @IsOptional()
  clientGeneratedId?: string;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => QrOrderItemDto)
  items: QrOrderItemDto[];
}
