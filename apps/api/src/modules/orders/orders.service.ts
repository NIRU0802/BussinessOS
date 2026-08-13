import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Prisma,
  OrderStatus,
  VoidRefundStatus,
  VoidRefundType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { TaxService } from '../tax/tax.service';
import { recomputeTax } from './tax-recompute.helper';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddOrderItemsDto } from './dto/add-order-items.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { VoidRefundRequestDto } from './dto/void-refund-request.dto';
import { ApproveVoidRefundDto } from './dto/approve-void-refund.dto';
import { SplitBillDto, SplitMode } from './dto/split-bill.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import * as bcrypt from 'bcrypt';
import {
  ORDER_EVENTS,
  OrderCreatedEvent,
  OrderItemsAddedEvent,
  OrderStatusUpdatedEvent,
  OrderPaidEvent,
  OrderVoidRefundEvent,
  TableStatusChangedEvent,
} from './events/order.events';

interface RequestUser {
  id: string;
  tenantId: string;
  permissions: string[];
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly taxService: TaxService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ---------------------------------------------------------------------
  // CREATE ORDER — idempotent on clientGeneratedId. Tax is ALWAYS
  // recomputed server-side from branch.country + tenant's default
  // TaxClass; the client's subtotal is trusted (it's just a sum of
  // unitPrice × quantity, verifiable from the items array itself), but
  // taxAmount/total are never trusted blindly — a compromised or stale
  // offline client could otherwise under-report tax. If the client's
  // sent tax differs from the server's computed tax beyond a small
  // rounding tolerance, the server value silently wins and is logged.
  // ---------------------------------------------------------------------
  async createOrder(user: RequestUser, dto: CreateOrderDto) {
    const existing = await this.prisma.forTenant(user.tenantId, (tx) =>
      tx.order.findUnique({
        where: { clientGeneratedId: dto.clientGeneratedId },
        include: { items: true, payments: true },
      }),
    );
    if (existing) {
      return existing;
    }

    if (dto.tableId) {
      await this.assertNoActiveOrderForTable(
        user.tenantId,
        dto.branchId,
        dto.tableId,
        dto.clientGeneratedId,
      );
    }

    const subtotal = new Prisma.Decimal(dto.subtotal);
    const clientTaxAmount = new Prisma.Decimal(dto.taxAmount);
    const recomputed = await recomputeTax(
      this.prisma,
      this.taxService,
      user.tenantId,
      dto.branchId,
      subtotal,
      clientTaxAmount,
    );
    if (recomputed.mismatchDetected) {
      this.logger.warn(
        `Tax mismatch on order create (device ${dto.deviceId}, client ${dto.clientGeneratedId}): client sent ${clientTaxAmount.toString()}, server computed ${recomputed.taxAmount.toString()}. Server value used.`,
      );
    }

    const order = await this.prisma.forTenant(user.tenantId, (tx) =>
      tx.order.create({
        data: {
          tenantId: user.tenantId,
          branchId: dto.branchId,
          tableId: dto.tableId ?? null,
          deviceId: dto.deviceId,
          clientGeneratedId: dto.clientGeneratedId,
          channel: dto.channel,
          status: OrderStatus.open,
          subtotal,
          taxAmount: recomputed.taxAmount,
          total: recomputed.total,
          createdBy: user.id,
          items: {
            create: dto.items.map((item) => ({
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
      }),
    );

    this.eventEmitter.emit(ORDER_EVENTS.CREATED, {
      tenantId: user.tenantId,
      branchId: dto.branchId,
      orderId: order.id,
      channel: order.channel,
      tableId: order.tableId,
    } satisfies OrderCreatedEvent);

    if (dto.tableId) {
      this.eventEmitter.emit(ORDER_EVENTS.TABLE_STATUS_CHANGED, {
        tenantId: user.tenantId,
        branchId: dto.branchId,
        tableId: dto.tableId,
        status: 'busy',
      } satisfies TableStatusChangedEvent);
    }

    return order;
  }

  private async assertNoActiveOrderForTable(
    tenantId: string,
    branchId: string,
    tableId: string,
    incomingClientGeneratedId: string,
  ) {
    const active = await this.prisma.forTenant(tenantId, (tx) =>
      tx.order.findFirst({
        where: {
          branchId,
          tableId,
          status: { in: [OrderStatus.open, OrderStatus.held] },
          clientGeneratedId: { not: incomingClientGeneratedId },
        },
      }),
    );
    if (active) {
      throw new ConflictException(
        `Table ${tableId} already has an active order (${active.id}). Resolve or add items to the existing order instead.`,
      );
    }
  }

  // ---------------------------------------------------------------------
  // GET / LIST
  // ---------------------------------------------------------------------
  async getOrderById(user: RequestUser, orderId: string) {
    const order = await this.prisma.forTenant(user.tenantId, (tx) =>
      tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, payments: true, voidRefundRequests: true },
      }),
    );
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async listOrders(user: RequestUser, query: ListOrdersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const where: Prisma.OrderWhereInput = {
      ...(query.branchId && { branchId: query.branchId }),
      ...(query.tableId && { tableId: query.tableId }),
      ...(query.channel && { channel: query.channel }),
      ...(query.status && { status: query.status }),
      ...(query.fromDate || query.toDate
        ? {
            createdAt: {
              ...(query.fromDate && { gte: new Date(query.fromDate) }),
              ...(query.toDate && { lte: new Date(query.toDate) }),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.forTenant(user.tenantId, (tx) =>
      Promise.all([
        tx.order.findMany({
          where,
          include: { items: true, payments: true },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        tx.order.count({ where }),
      ]),
    );

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ---------------------------------------------------------------------
  // UPDATE STATUS
  // ---------------------------------------------------------------------
  async updateStatus(
    user: RequestUser,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ) {
    const order = await this.getOrderById(user, orderId);

    if (
      dto.status === OrderStatus.voided ||
      dto.status === OrderStatus.refunded
    ) {
      throw new ForbiddenException(
        'Void/refund must go through the void-refund request + approval flow, not a direct status update.',
      );
    }

    const updated = await this.prisma.forTenant(user.tenantId, (tx) =>
      tx.order.update({
        where: { id: orderId },
        data: { status: dto.status, syncVersion: { increment: 1 } },
        include: { items: true, payments: true },
      }),
    );

    this.eventEmitter.emit(ORDER_EVENTS.STATUS_UPDATED, {
      tenantId: user.tenantId,
      branchId: order.branchId,
      orderId,
      status: updated.status,
    } satisfies OrderStatusUpdatedEvent);

    if (dto.status === OrderStatus.paid && order.tableId) {
      this.eventEmitter.emit(ORDER_EVENTS.TABLE_STATUS_CHANGED, {
        tenantId: user.tenantId,
        branchId: order.branchId,
        tableId: order.tableId,
        status: 'available',
      } satisfies TableStatusChangedEvent);
    }

    return updated;
  }

  // ---------------------------------------------------------------------
  // ADD ITEMS (batched, never silently merged). Tax is recomputed on the
  // NEW total subtotal (not just incrementally added on the delta) since
  // some tax schemes are tiered/non-linear — always derive fresh from the
  // full subtotal rather than adding tax-on-tax.
  // ---------------------------------------------------------------------
  async addItems(user: RequestUser, orderId: string, dto: AddOrderItemsDto) {
    const order = await this.getOrderById(user, orderId);

    if (
      order.status !== OrderStatus.open &&
      order.status !== OrderStatus.held
    ) {
      throw new BadRequestException(
        `Cannot add items to an order with status "${order.status}"`,
      );
    }

    const addedSubtotal = dto.items.reduce(
      (sum, i) => sum.add(new Prisma.Decimal(i.unitPrice).mul(i.quantity)),
      new Prisma.Decimal(0),
    );
    const newSubtotal = order.subtotal.add(addedSubtotal);

    const recomputed = await recomputeTax(
      this.prisma,
      this.taxService,
      user.tenantId,
      order.branchId,
      newSubtotal,
    );

    const updated = await this.prisma.forTenant(user.tenantId, async (tx) => {
      const lastBatch = await tx.orderItem.aggregate({
        where: { orderId },
        _max: { batchNumber: true },
      });
      const nextBatch = (lastBatch._max.batchNumber ?? 0) + 1;

      await tx.orderItem.createMany({
        data: dto.items.map((item) => ({
          tenantId: user.tenantId,
          orderId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: new Prisma.Decimal(item.unitPrice),
          modifiers: (item.modifiers ??
            Prisma.JsonNull) as Prisma.InputJsonValue,
          batchNumber: nextBatch,
        })),
      });

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          subtotal: newSubtotal,
          taxAmount: recomputed.taxAmount,
          total: recomputed.total,
          syncVersion: { increment: 1 },
        },
        include: { items: true, payments: true },
      });

      return { updatedOrder, nextBatch };
    });

    this.eventEmitter.emit(ORDER_EVENTS.ITEMS_ADDED, {
      tenantId: user.tenantId,
      branchId: order.branchId,
      orderId,
      batchNumber: updated.nextBatch,
    } satisfies OrderItemsAddedEvent);

    return updated.updatedOrder;
  }

  // ---------------------------------------------------------------------
  // VOID / REFUND REQUEST (any staff can request)
  // ---------------------------------------------------------------------
  async requestVoidRefund(
    user: RequestUser,
    orderId: string,
    dto: VoidRefundRequestDto,
  ) {
    const order = await this.getOrderById(user, orderId);

    if (
      dto.type === VoidRefundType.void &&
      order.status !== OrderStatus.open &&
      order.status !== OrderStatus.held &&
      order.status !== OrderStatus.paid
    ) {
      throw new BadRequestException(
        `Order with status "${order.status}" cannot be voided.`,
      );
    }
    if (
      dto.type === VoidRefundType.refund &&
      order.status !== OrderStatus.paid
    ) {
      throw new BadRequestException('Only paid orders can be refunded.');
    }

    const request = await this.prisma.forTenant(user.tenantId, (tx) =>
      tx.voidRefundRequest.create({
        data: {
          tenantId: user.tenantId,
          orderId,
          type: dto.type,
          requestedBy: user.id,
          reason: dto.reason,
          status: VoidRefundStatus.pending,
        },
      }),
    );

    await this.auditLog.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: `void_refund.requested.${dto.type}`,
      entityType: 'order',
      entityId: orderId,
      metadata: { requestId: request.id, reason: dto.reason },
    });

    this.eventEmitter.emit(ORDER_EVENTS.VOID_REFUND_REQUESTED, {
      tenantId: user.tenantId,
      branchId: order.branchId,
      orderId,
      requestId: request.id,
      type: dto.type,
    } satisfies OrderVoidRefundEvent);

    return request;
  }

  // ---------------------------------------------------------------------
  // VOID / REFUND APPROVAL (Manager/Owner PIN required)
  // ---------------------------------------------------------------------
  async approveVoidRefund(
    user: RequestUser,
    orderId: string,
    requestId: string,
    dto: ApproveVoidRefundDto,
  ) {
    if (
      !user.permissions.includes('*') &&
      !user.permissions.includes('orders.approve_void_refund')
    ) {
      throw new ForbiddenException(
        'You do not have permission to approve void/refund requests.',
      );
    }

    if (dto.decision === VoidRefundStatus.pending) {
      throw new BadRequestException(
        'Decision must be "approved" or "rejected".',
      );
    }

    await this.verifyManagerPin(user.tenantId, user.id, dto.pin);

    const request = await this.prisma.forTenant(user.tenantId, (tx) =>
      tx.voidRefundRequest.findUnique({ where: { id: requestId } }),
    );
    if (!request || request.orderId !== orderId) {
      throw new NotFoundException(
        'Void/refund request not found for this order.',
      );
    }
    if (request.status !== VoidRefundStatus.pending) {
      throw new BadRequestException(`Request already ${request.status}.`);
    }

    const order = await this.getOrderById(user, orderId);

    const updatedRequest = await this.prisma.forTenant(
      user.tenantId,
      async (tx) => {
        const reqUpdate = await tx.voidRefundRequest.update({
          where: { id: requestId },
          data: {
            status: dto.decision,
            approvedBy: user.id,
            approvedAt: new Date(),
          },
        });

        if (dto.decision === VoidRefundStatus.approved) {
          const newStatus =
            request.type === VoidRefundType.void
              ? OrderStatus.voided
              : OrderStatus.refunded;
          await tx.order.update({
            where: { id: orderId },
            data: { status: newStatus, syncVersion: { increment: 1 } },
          });
        }

        return reqUpdate;
      },
    );

    await this.auditLog.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: `void_refund.${dto.decision}`,
      entityType: 'order',
      entityId: orderId,
      metadata: { requestId, type: request.type, decidedBy: user.id },
    });

    if (dto.decision === VoidRefundStatus.approved) {
      const approvedEventPayload: OrderVoidRefundEvent = {
        tenantId: user.tenantId,
        branchId: order.branchId,
        orderId,
        requestId,
        type: request.type,
        decidedBy: user.id,
      };

      this.eventEmitter.emit(
        ORDER_EVENTS.VOID_REFUND_APPROVED,
        approvedEventPayload,
      );

      this.eventEmitter.emit(
        request.type === VoidRefundType.void
          ? ORDER_EVENTS.VOIDED
          : ORDER_EVENTS.REFUNDED,
        approvedEventPayload,
      );

      if (order.tableId) {
        this.eventEmitter.emit(ORDER_EVENTS.TABLE_STATUS_CHANGED, {
          tenantId: user.tenantId,
          branchId: order.branchId,
          tableId: order.tableId,
          status: 'available',
        } satisfies TableStatusChangedEvent);
      }
    }

    return updatedRequest;
  }

  private async verifyManagerPin(
    tenantId: string,
    userId: string,
    pin: string,
  ) {
    const record = await this.prisma.forTenant(tenantId, (tx) =>
      tx.userPin.findUnique({
        where: { tenantId_userId: { tenantId, userId } },
      }),
    );
    if (!record) {
      throw new ForbiddenException(
        'No PIN configured for this account. Use full login to approve instead.',
      );
    }
    const valid = await bcrypt.compare(pin, record.pinHash);
    if (!valid) {
      throw new ForbiddenException('Incorrect PIN.');
    }
  }

  // ---------------------------------------------------------------------
  // BILL SPLITTING — validation reads happen first, then both writes
  // (payments createMany + order status update) share one forTenant call.
  // ---------------------------------------------------------------------
  async splitBill(user: RequestUser, orderId: string, dto: SplitBillDto) {
    const order = await this.getOrderById(user, orderId);

    if (
      order.status !== OrderStatus.open &&
      order.status !== OrderStatus.held
    ) {
      throw new BadRequestException(
        `Cannot split payment on an order with status "${order.status}"`,
      );
    }

    let shareRecords: {
      method: string;
      amount: Prisma.Decimal;
      paidByCustomerRef?: string;
    }[];

    if (dto.mode === SplitMode.BY_ITEM) {
      const allItemIds = new Set(order.items.map((i) => i.id));
      const assignedItemIds = new Set<string>();

      shareRecords = dto.shares.map((share) => {
        if (!share.itemIds || share.itemIds.length === 0) {
          throw new BadRequestException(
            'itemIds is required for each share in by_item mode.',
          );
        }
        let shareTotal = new Prisma.Decimal(0);
        for (const itemId of share.itemIds) {
          if (!allItemIds.has(itemId)) {
            throw new BadRequestException(
              `Item ${itemId} does not belong to this order.`,
            );
          }
          if (assignedItemIds.has(itemId)) {
            throw new BadRequestException(
              `Item ${itemId} was already assigned to another share.`,
            );
          }
          assignedItemIds.add(itemId);
          const item = order.items.find((i) => i.id === itemId)!;
          shareTotal = shareTotal.add(item.unitPrice.mul(item.quantity));
        }
        return {
          method: share.method,
          amount: shareTotal,
          paidByCustomerRef: share.paidByCustomerRef,
        };
      });

      if (assignedItemIds.size !== allItemIds.size) {
        throw new BadRequestException(
          'All order items must be assigned to a payment share.',
        );
      }
    } else {
      shareRecords = dto.shares.map((share) => {
        if (!share.amount) {
          throw new BadRequestException(
            'amount is required for each share in equal_share mode.',
          );
        }
        return {
          method: share.method,
          amount: new Prisma.Decimal(share.amount),
          paidByCustomerRef: share.paidByCustomerRef,
        };
      });
    }

    const sum = shareRecords.reduce(
      (acc, s) => acc.add(s.amount),
      new Prisma.Decimal(0),
    );
    if (!sum.equals(order.total)) {
      throw new BadRequestException(
        `Payment shares (${sum.toString()}) do not sum to order total (${order.total.toString()}).`,
      );
    }

    const updatedOrder = await this.prisma.forTenant(
      user.tenantId,
      async (tx) => {
        await tx.orderPayment.createMany({
          data: shareRecords.map((s) => ({
            tenantId: user.tenantId,
            orderId,
            method: s.method as any,
            amount: s.amount,
            status: 'completed' as any,
            paidByCustomerRef: s.paidByCustomerRef ?? null,
          })),
        });

        return tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.paid, syncVersion: { increment: 1 } },
          include: { items: true, payments: true },
        });
      },
    );

    this.eventEmitter.emit(ORDER_EVENTS.PAID, {
      tenantId: user.tenantId,
      branchId: order.branchId,
      orderId,
      total: updatedOrder.total.toString(),
    } satisfies OrderPaidEvent);

    if (order.tableId) {
      this.eventEmitter.emit(ORDER_EVENTS.TABLE_STATUS_CHANGED, {
        tenantId: user.tenantId,
        branchId: order.branchId,
        tableId: order.tableId,
        status: 'available',
      } satisfies TableStatusChangedEvent);
    }

    return updatedOrder;
  }
}
