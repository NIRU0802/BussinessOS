import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { ORDER_EVENTS } from '../../orders/events/order.events';
import type { TableStatusChangedEvent } from '../../orders/events/order.events';
import { TABLE_EVENTS } from '../events/table.events';

/**
 * Subscribes to Orders' TABLE_STATUS_CHANGED event (Phase 4) to keep
 * Table.status in sync and auto-manage DiningSession lifecycle, without
 * Orders or Tables reaching into each other's repositories directly —
 * matches the locked "module boundaries via EventEmitter2" rule.
 */
@Injectable()
export class TableOrderStatusListener {
  private readonly logger = new Logger(TableOrderStatusListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(ORDER_EVENTS.TABLE_STATUS_CHANGED)
  async handle(event: TableStatusChangedEvent) {
    try {
      if (event.status === 'busy') {
        await this.openTable(event);
      } else {
        await this.closeTable(event);
      }
    } catch (err) {
      // Never let a listener failure break order processing — log and move on.
      this.logger.error(
        `Failed to sync table ${event.tableId} for tenant ${event.tenantId}: ${err}`,
      );
    }
  }

  private async openTable(event: TableStatusChangedEvent) {
    await this.prisma.forTenant(event.tenantId, (tx) =>
      tx.table.update({
        where: { id: event.tableId },
        data: { status: 'occupied' },
      }),
    );

    const existingActive = await this.prisma.forTenant(event.tenantId, (tx) =>
      tx.diningSession.findFirst({
        where: { tableId: event.tableId, status: 'active' },
      }),
    );
    if (existingActive) return;

    const session = await this.prisma.forTenant(event.tenantId, (tx) =>
      tx.diningSession.create({
        data: {
          tenantId: event.tenantId,
          branchId: event.branchId,
          tableId: event.tableId,
          status: 'active',
        },
      }),
    );

    this.eventEmitter.emit(TABLE_EVENTS.DINING_SESSION_OPENED, {
      tenantId: event.tenantId,
      branchId: event.branchId,
      tableId: event.tableId,
      diningSessionId: session.id,
    });
  }

  private async closeTable(event: TableStatusChangedEvent) {
    await this.prisma.forTenant(event.tenantId, (tx) =>
      tx.table.update({
        where: { id: event.tableId },
        data: { status: 'available' },
      }),
    );

    const activeSession = await this.prisma.forTenant(event.tenantId, (tx) =>
      tx.diningSession.findFirst({
        where: { tableId: event.tableId, status: 'active' },
      }),
    );
    if (!activeSession) return;

    await this.prisma.forTenant(event.tenantId, (tx) =>
      tx.diningSession.update({
        where: { id: activeSession.id },
        data: { status: 'closed', closedAt: new Date() },
      }),
    );

    this.eventEmitter.emit(TABLE_EVENTS.DINING_SESSION_CLOSED, {
      tenantId: event.tenantId,
      branchId: event.branchId,
      tableId: event.tableId,
      diningSessionId: activeSession.id,
    });
  }
}
