import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { TaxService } from '../tax/tax.service';
import { recomputeTax } from './tax-recompute.helper';
import { PullChangesQueryDto } from './dto/pull-changes-query.dto';
import { PushQueuedOrdersDto } from './dto/push-queued-orders.dto';
import {
  ORDER_EVENTS,
  OrderCreatedEvent,
  OrderStatusUpdatedEvent,
  SyncConflictEvent,
  TableStatusChangedEvent,
} from './events/order.events';

interface RequestUser {
  id: string;
  tenantId: string;
  permissions: string[];
}

@Injectable()
export class SyncEngineService {
  private readonly logger = new Logger(SyncEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly taxService: TaxService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ---------------------------------------------------------------------
  // PULL: everything changed since lastSyncedAt, for this branch.
  // ---------------------------------------------------------------------
  async pullChangesSince(user: RequestUser, query: PullChangesQueryDto) {
    const since = new Date(query.lastSyncedAt);

    const { orders, tableStatusChanges, conflicts } =
      await this.prisma.forTenant(user.tenantId, async (tx) => {
        const [orders, tableStatusChanges, conflicts] = await Promise.all([
          tx.order.findMany({
            where: { branchId: query.branchId, updatedAt: { gt: since } },
            include: { items: true, payments: true, voidRefundRequests: true },
            orderBy: { updatedAt: 'asc' },
          }),
          tx.order.findMany({
            where: {
              branchId: query.branchId,
              updatedAt: { gt: since },
              tableId: { not: null },
            },
            select: { tableId: true, status: true, updatedAt: true },
            orderBy: { updatedAt: 'asc' },
          }),
          tx.syncConflict.findMany({
            where: { branchId: query.branchId, status: 'pending' },
            include: { orderA: true, orderB: true },
          }),
        ]);
        return { orders, tableStatusChanges, conflicts };
      });

    return {
      serverTime: new Date().toISOString(),
      orders,
      tableStatusChanges: tableStatusChanges.map((t) => ({
        tableId: t.tableId,
        status: this.deriveTableStatus(t.status),
        updatedAt: t.updatedAt,
      })),
      pendingConflicts: conflicts,
    };
  }

  private deriveTableStatus(status: OrderStatus): 'busy' | 'available' {
    return status === OrderStatus.open || status === OrderStatus.held
      ? 'busy'
      : 'available';
  }

  // ---------------------------------------------------------------------
  // PUSH: idempotent per order via clientGeneratedId. Sequential to keep
  // in-batch conflict detection correct.
  // ---------------------------------------------------------------------
  async pushQueuedOrders(user: RequestUser, dto: PushQueuedOrdersDto) {
    if (dto.orders.length === 0) {
      throw new BadRequestException('No orders provided to push.');
    }

    const results: Array<{
      clientGeneratedId: string;
      status: 'created' | 'already_existed' | 'conflict_flagged';
      orderId: string;
      conflictId?: string;
    }> = [];

    for (const orderDto of dto.orders) {
      const result = await this.pushSingleOrder(user, orderDto);
      results.push(result);
    }

    return { results };
  }

  // Same tax trust boundary as OrdersService.createOrder — an offline
  // device's client-sent taxAmount/total is a preview only. The server
  // always recomputes independently from branch.country + the tenant's
  // default TaxClass before persisting.
  private async pushSingleOrder(
    user: RequestUser,
    orderDto: PushQueuedOrdersDto['orders'][number],
  ) {
    const existing = await this.prisma.forTenant(user.tenantId, (tx) =>
      tx.order.findUnique({
        where: { clientGeneratedId: orderDto.clientGeneratedId },
      }),
    );
    if (existing) {
      return {
        clientGeneratedId: orderDto.clientGeneratedId,
        status: 'already_existed' as const,
        orderId: existing.id,
      };
    }

    const subtotal = new Prisma.Decimal(orderDto.subtotal);
    const clientTaxAmount = new Prisma.Decimal(orderDto.taxAmount);
    const recomputed = await recomputeTax(
      this.prisma,
      this.taxService,
      user.tenantId,
      orderDto.branchId,
      subtotal,
      clientTaxAmount,
    );
    if (recomputed.mismatchDetected) {
      this.logger.warn(
        `Tax mismatch on sync push (device ${orderDto.deviceId}, client ${orderDto.clientGeneratedId}): client sent ${clientTaxAmount.toString()}, server computed ${recomputed.taxAmount.toString()}. Server value used.`,
      );
    }

    const { created, conflictingOrder } = await this.prisma.forTenant(
      user.tenantId,
      async (tx) => {
        let conflictingOrder: { id: string } | null = null;
        if (orderDto.tableId) {
          conflictingOrder = await tx.order.findFirst({
            where: {
              branchId: orderDto.branchId,
              tableId: orderDto.tableId,
              status: { in: [OrderStatus.open, OrderStatus.held] },
              clientGeneratedId: { not: orderDto.clientGeneratedId },
            },
          });
        }

        const created = await tx.order.create({
          data: {
            tenantId: user.tenantId,
            branchId: orderDto.branchId,
            tableId: orderDto.tableId ?? null,
            deviceId: orderDto.deviceId,
            clientGeneratedId: orderDto.clientGeneratedId,
            channel: orderDto.channel,
            status: OrderStatus.open,
            subtotal,
            taxAmount: recomputed.taxAmount,
            total: recomputed.total,
            createdBy: user.id,
            items: {
              create: orderDto.items.map((item) => ({
                tenantId: user.tenantId,
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: new Prisma.Decimal(item.unitPrice),
                modifiers: (item.modifiers ??
                  Prisma.JsonNull) as Prisma.InputJsonValue,
                batchNumber: 1,
              })),
            },
          },
          include: { items: true, payments: true },
        });

        return { created, conflictingOrder };
      },
    );

    this.eventEmitter.emit(ORDER_EVENTS.CREATED, {
      tenantId: user.tenantId,
      branchId: orderDto.branchId,
      orderId: created.id,
      channel: created.channel,
      tableId: created.tableId,
    } satisfies OrderCreatedEvent);

    if (conflictingOrder) {
      const conflict = await this.prisma.forTenant(user.tenantId, (tx) =>
        tx.syncConflict.create({
          data: {
            tenantId: user.tenantId,
            branchId: orderDto.branchId,
            tableId: orderDto.tableId!,
            orderAId: conflictingOrder!.id,
            orderBId: created.id,
            status: 'pending',
          },
          include: { orderA: true, orderB: true },
        }),
      );

      await this.auditLog.log({
        tenantId: user.tenantId,
        userId: user.id,
        action: 'sync.conflict_detected',
        entityType: 'order',
        entityId: created.id,
        metadata: {
          conflictId: conflict.id,
          orderAId: conflictingOrder.id,
          orderBId: created.id,
        },
      });

      this.eventEmitter.emit(ORDER_EVENTS.SYNC_CONFLICT_DETECTED, {
        tenantId: user.tenantId,
        branchId: orderDto.branchId,
        conflictId: conflict.id,
        tableId: orderDto.tableId!,
        orderAId: conflictingOrder.id,
        orderBId: created.id,
      } satisfies SyncConflictEvent);

      return {
        clientGeneratedId: orderDto.clientGeneratedId,
        status: 'conflict_flagged' as const,
        orderId: created.id,
        conflictId: conflict.id,
      };
    }

    if (orderDto.tableId) {
      this.eventEmitter.emit(ORDER_EVENTS.TABLE_STATUS_CHANGED, {
        tenantId: user.tenantId,
        branchId: orderDto.branchId,
        tableId: orderDto.tableId,
        status: 'busy',
      } satisfies TableStatusChangedEvent);
    }

    return {
      clientGeneratedId: orderDto.clientGeneratedId,
      status: 'created' as const,
      orderId: created.id,
    };
  }

  // ---------------------------------------------------------------------
  // Manual conflict resolution — no auto-merge anywhere.
  // ---------------------------------------------------------------------
  async resolveConflict(
    user: RequestUser,
    conflictId: string,
    keepOrderId: string,
    resolutionNote: string,
  ) {
    const conflict = await this.prisma.forTenant(user.tenantId, (tx) =>
      tx.syncConflict.findUnique({ where: { id: conflictId } }),
    );
    if (!conflict) {
      throw new BadRequestException('Conflict not found.');
    }
    if (
      conflict.orderAId !== keepOrderId &&
      conflict.orderBId !== keepOrderId
    ) {
      throw new BadRequestException(
        'keepOrderId must be one of the two conflicting orders.',
      );
    }

    const cancelOrderId =
      conflict.orderAId === keepOrderId ? conflict.orderBId : conflict.orderAId;

    await this.prisma.forTenant(user.tenantId, async (tx) => {
      await tx.order.update({
        where: { id: cancelOrderId },
        data: { status: OrderStatus.cancelled, syncVersion: { increment: 1 } },
      });
      await tx.syncConflict.update({
        where: { id: conflictId },
        data: {
          status: 'resolved',
          resolvedBy: user.id,
          resolvedAt: new Date(),
        },
      });
    });

    await this.auditLog.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'sync.conflict_resolved',
      entityType: 'order',
      entityId: keepOrderId,
      metadata: {
        conflictId,
        cancelledOrderId: cancelOrderId,
        note: resolutionNote,
      },
    });

    this.eventEmitter.emit(ORDER_EVENTS.STATUS_UPDATED, {
      tenantId: user.tenantId,
      branchId: conflict.branchId,
      orderId: cancelOrderId,
      status: OrderStatus.cancelled,
    } satisfies OrderStatusUpdatedEvent);

    this.eventEmitter.emit(ORDER_EVENTS.TABLE_STATUS_CHANGED, {
      tenantId: user.tenantId,
      branchId: conflict.branchId,
      tableId: conflict.tableId,
      status: 'busy',
    } satisfies TableStatusChangedEvent);

    this.eventEmitter.emit(ORDER_EVENTS.SYNC_CONFLICT_RESOLVED, {
      tenantId: user.tenantId,
      branchId: conflict.branchId,
      conflictId,
      tableId: conflict.tableId,
      orderAId: conflict.orderAId,
      orderBId: conflict.orderBId,
    } satisfies SyncConflictEvent);

    return {
      resolved: true,
      keptOrderId: keepOrderId,
      cancelledOrderId: cancelOrderId,
    };
  }
}
