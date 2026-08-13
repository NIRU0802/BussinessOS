import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order.dto';

// Items added AFTER the initial ticket. Each call to this endpoint is
// stamped with an incrementing batchNumber on the OrderItem rows so a
// later Kitchen Display phase can distinguish "round 1" from "round 2"
// instead of silently merging them into one flat item list.
export class AddOrderItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
