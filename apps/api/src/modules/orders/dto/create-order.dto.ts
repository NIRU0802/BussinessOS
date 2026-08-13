import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderChannel } from '@prisma/client';

export class CreateOrderItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNotEmpty()
  unitPrice: string; // decimal passed as string, parsed server-side

  @IsOptional()
  @IsObject()
  modifiers?: Record<string, unknown>;
}

export class CreateOrderDto {
  @IsUUID()
  branchId: string;

  @IsOptional()
  @IsUUID()
  tableId?: string;

  @IsString()
  @IsNotEmpty()
  deviceId: string;

  // Generated client-side (Electron/Mobile) at order-creation time.
  // Used as the idempotency key for offline sync and duplicate submission
  // protection. Must be a UUID generated ONCE per logical order.
  @IsUUID()
  clientGeneratedId: string;

  @IsEnum(OrderChannel)
  channel: OrderChannel;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsNotEmpty()
  subtotal: string;

  @IsNotEmpty()
  taxAmount: string;

  @IsNotEmpty()
  total: string;
}
