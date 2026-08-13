import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderDto } from './create-order.dto';

// Each queued order carries its own clientGeneratedId (set on-device at
// the moment it was created while offline), which is what makes the push
// idempotent and safe to retry.
export class PushQueuedOrdersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderDto)
  orders: CreateOrderDto[];
}
