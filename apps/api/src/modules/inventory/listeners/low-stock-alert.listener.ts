import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';
import { SendNotificationDto } from '../../notification/dto/send-notification.dto';
import { INVENTORY_EVENTS } from '../events/inventory.events';
import type { InventoryLowStockEvent } from '../events/inventory.events';

/**
 * Listens for inventory.low_stock and alerts the branch manager(s) via the
 * Multi-Channel Notification Engine. This is an operational alert, not
 * marketing — it is not gated by marketing_consent (that flag exists
 * specifically for WhatsApp marketing sends per the CRM spec).
 */
@Injectable()
export class LowStockAlertListener {
  private readonly logger = new Logger(LowStockAlertListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  @OnEvent(INVENTORY_EVENTS.LOW_STOCK)
  async handleLowStock(event: InventoryLowStockEvent) {
    const managers = await this.prisma.forTenant(event.tenantId, (tx) =>
      tx.user.findMany({
        where: {
          isActive: true,
          branches: { some: { branchId: event.branchId } },
          roles: { some: { role: { name: 'MANAGER' } } },
        },
      }),
    );

    if (managers.length === 0) {
      this.logger.warn(
        `Low stock on "${event.inventoryItemName}" at branch ${event.branchId} but no active manager found to notify.`,
      );
      return;
    }

    const body = `Low stock alert: "${event.inventoryItemName}" is at ${event.currentQuantity} ${event.unit}, below your threshold of ${event.lowStockThreshold} ${event.unit}.`;

    for (const manager of managers) {
      if (!manager.phone) {
        continue;
      }

      const dto: SendNotificationDto = {
        channel: 'sms',
        triggerType: 'transactional',
        mode: 'auto_send',
        consentGated: false,
        recipient: manager.phone,
        branchId: event.branchId,
        templateKey: 'inventory_low_stock',
        subject: 'Low Stock Alert',
        body,
        variables: {
          inventoryItemName: event.inventoryItemName,
          currentQuantity: event.currentQuantity,
          lowStockThreshold: event.lowStockThreshold,
          unit: event.unit,
        },
      };

      try {
        await this.notificationService.send(event.tenantId, dto);
      } catch (err) {
        this.logger.error(
          `Failed to send low-stock alert to manager ${manager.id}: ${err}`,
        );
      }
    }
  }
}
