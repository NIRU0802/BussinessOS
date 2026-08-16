import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { WidgetsService } from '../../widgets/widgets.service';
import { StockService } from '../stock.service';
import { ORDER_EVENTS } from '../../orders/events/order.events';
import type { OrderPaidEvent } from '../../orders/events/order.events';

/**
 * Listens for order.paid (Phase 4) and deducts stock for every ingredient
 * mapped via product_ingredients. The PAID event payload only carries
 * orderId/total (no items), so order items are re-fetched here.
 */
@Injectable()
export class OrderPaidStockDeductionListener {
  private readonly logger = new Logger(OrderPaidStockDeductionListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly widgetsService: WidgetsService,
    private readonly stockService: StockService,
  ) {}

  @OnEvent(ORDER_EVENTS.PAID)
  async handleOrderPaid(event: OrderPaidEvent) {
    const inventoryActive = await this.widgetsService.isWidgetActive(
      event.tenantId,
      'inventory',
    );
    if (!inventoryActive) {
      return;
    }

    const orderItems = await this.prisma.forTenant(event.tenantId, (tx) =>
      tx.orderItem.findMany({ where: { orderId: event.orderId } }),
    );

    if (orderItems.length === 0) {
      return;
    }

    const productIds = [...new Set(orderItems.map((item) => item.productId))];

    const mappings = await this.prisma.forTenant(event.tenantId, (tx) =>
      tx.productIngredient.findMany({
        where: { productId: { in: productIds } },
      }),
    );

    if (mappings.length === 0) {
      return;
    }

    const mappingsByProduct = new Map<string, typeof mappings>();
    for (const mapping of mappings) {
      const list = mappingsByProduct.get(mapping.productId) ?? [];
      list.push(mapping);
      mappingsByProduct.set(mapping.productId, list);
    }

    for (const orderItem of orderItems) {
      const productMappings = mappingsByProduct.get(orderItem.productId);
      if (!productMappings) {
        continue;
      }

      for (const mapping of productMappings) {
        const quantityToDeduct =
          mapping.quantityUsed.toNumber() * orderItem.quantity;
        try {
          await this.stockService.deductForSale({
            tenantId: event.tenantId,
            branchId: event.branchId,
            inventoryItemId: mapping.inventoryItemId,
            quantityToDeduct,
            orderId: event.orderId,
          });
        } catch (err) {
          // Stock deduction failure must never roll back or block a
          // completed, paid order — log and move on to the next item.
          this.logger.error(
            `Failed to deduct stock for inventory item ${mapping.inventoryItemId} on order ${event.orderId}: ${err}`,
          );
        }
      }
    }
  }
}
