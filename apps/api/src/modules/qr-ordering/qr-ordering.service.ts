import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { OrderChannel } from '@prisma/client';
import { EffectiveMenuService } from '../menu/effective-menu.service';
import { OrdersService } from '../orders/orders.service';
import {
  CreateOrderDto,
  CreateOrderItemDto,
} from '../orders/dto/create-order.dto';
import { QrSession } from '../tables/qr/qr-session.service';
import { QrCreateOrderDto } from './dto/qr-order-item.dto';

@Injectable()
export class QrOrderingService {
  constructor(
    private readonly effectiveMenuService: EffectiveMenuService,
    private readonly ordersService: OrdersService,
  ) {}

  /** Returns the branch's customer-facing menu, resolved via the same
   * EffectiveMenuService staff/POS surfaces use — one source of truth. */
  async getMenu(session: QrSession) {
    return this.effectiveMenuService.getForBranch(session.branchId);
  }

  /**
   * Places an order for the verified table. branchId, tableId, and every
   * item's price are resolved server-side — nothing here is trusted from
   * the client except productId/variantId/modifierOptionIds/quantity.
   * Prices are computed as JS numbers internally, then converted to
   * fixed-2-decimal strings to match CreateOrderDto's decimal-as-string
   * convention (server-parsed, per its own comment).
   */
  async placeOrder(session: QrSession, dto: QrCreateOrderDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('Order must contain at least one item.');
    }

    const menu = await this.effectiveMenuService.getForBranch(session.branchId);
    const menuById = new Map(menu.map((item) => [item.id, item]));

    let subtotal = 0;
    const orderItems: CreateOrderItemDto[] = dto.items.map((requested) => {
      const menuItem = menuById.get(requested.productId);
      if (!menuItem) {
        throw new NotFoundException(
          `Menu item ${requested.productId} is not available at this branch.`,
        );
      }
      if (!menuItem.isAvailable) {
        throw new BadRequestException(
          `"${menuItem.name}" is currently unavailable.`,
        );
      }

      let unitPrice = menuItem.effectivePrice;
      let variantId: string | null = null;

      if (requested.variantId) {
        const variant = menuItem.variants.find(
          (v) => v.id === requested.variantId,
        );
        if (!variant) {
          throw new BadRequestException(
            `Invalid variant selected for "${menuItem.name}".`,
          );
        }
        unitPrice += variant.priceDelta;
        variantId = variant.id;
      }

      const selectedModifiers: {
        id: string;
        name: string;
        priceDelta: number;
      }[] = [];
      if (requested.modifierOptionIds?.length) {
        const allOptions = menuItem.modifierGroups.flatMap((g) => g.options);
        for (const optionId of requested.modifierOptionIds) {
          const option = allOptions.find((o) => o.id === optionId);
          if (!option) {
            throw new BadRequestException(
              `Invalid modifier selected for "${menuItem.name}".`,
            );
          }
          unitPrice += option.priceDelta;
          selectedModifiers.push(option);
        }
      }

      subtotal += unitPrice * requested.quantity;

      return {
        productId: requested.productId,
        quantity: requested.quantity,
        unitPrice: unitPrice.toFixed(2), // CreateOrderItemDto expects decimal-as-string
        modifiers: {
          variantId,
          selectedOptions: selectedModifiers.map((o) => ({
            id: o.id,
            name: o.name,
          })),
        },
      };
    });

    // Tax is always recomputed authoritatively server-side inside
    // OrdersService per your Phase 4 tax-recompute rule — this is just
    // the value passed in for the DTO's required field, not the source
    // of truth. Passing '0.00' rather than a guessed figure so any
    // client-tampering-detection/logging in that recompute path doesn't
    // get confused by a QR-guest-fabricated number.
    const subtotalStr = subtotal.toFixed(2);
    const taxAmountStr = '0.00';
    const totalStr = subtotal.toFixed(2);

    const createOrderDto: CreateOrderDto = {
      branchId: session.branchId,
      tableId: session.tableId,
      deviceId: 'qr-web',
      clientGeneratedId: dto.clientGeneratedId ?? crypto.randomUUID(),
      channel: OrderChannel.qr,
      items: orderItems,
      subtotal: subtotalStr,
      taxAmount: taxAmountStr,
      total: totalStr,
    };

    const order = await this.ordersService.createOrder(
      { id: 'qr-guest', tenantId: session.tenantId, permissions: [] },
      createOrderDto,
    );

    return order;
  }
}
