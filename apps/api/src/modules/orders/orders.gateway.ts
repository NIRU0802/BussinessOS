import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseGuards, Logger, forwardRef, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';
import { OrdersService } from './orders.service';
import { ORDER_EVENTS } from './events/order.events';

import type {
  OrderCreatedEvent,
  OrderItemsAddedEvent,
  OrderStatusUpdatedEvent,
  OrderPaidEvent,
  OrderVoidRefundEvent,
  SyncConflictEvent,
  TableStatusChangedEvent,
} from './events/order.events';

interface JoinBranchPayload {
  branchId: string;
}

// System user context used ONLY for the gateway's own internal reads of
// order data to enrich socket broadcasts. This bypasses per-request RBAC
// (there is no real "requesting user" in an event listener) but still
// goes through PrismaService.forTenant for RLS tenant isolation, and only
// ever reads — never writes — via OrdersService.getOrderById.
const SYSTEM_BROADCAST_PERMISSIONS = ['*'];

@WebSocketGateway({
  cors: { origin: '*', credentials: true }, // tighten to actual origins in production env config
  namespace: '/orders',
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrdersGateway.name);

  // forwardRef guards against a circular-import edge case if OrdersService
  // is ever changed to depend on the gateway again later; harmless today
  // since the dependency is currently one-directional (gateway -> service).
  constructor(
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.debug(`Socket connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Socket disconnected: ${client.id}`);
  }

  // WsJwtGuard populates client.data.user from the verified JWT — tenantId
  // is taken from THAT payload, never from client input, so a socket can
  // only ever join rooms for its own authenticated tenant.
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join-branch')
  handleJoinBranch(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinBranchPayload,
  ) {
    const user = client.data.user as {
      tenantId: string;
      branchIds: string[];
      isAllBranches: boolean;
    };

    if (!user.isAllBranches && !user.branchIds.includes(payload.branchId)) {
      client.emit('join-branch-error', {
        message: 'You do not have access to this branch.',
      });
      return;
    }

    const room = this.roomFor(user.tenantId, payload.branchId);
    client.join(room);
    client.emit('joined-branch', { room });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leave-branch')
  handleLeaveBranch(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinBranchPayload,
  ) {
    const user = client.data.user as { tenantId: string };
    client.leave(this.roomFor(user.tenantId, payload.branchId));
  }

  private roomFor(tenantId: string, branchId: string): string {
    return `tenant:${tenantId}:branch:${branchId}`;
  }

  // ---------------------------------------------------------------------
  // Event listeners. OrdersService only emits lightweight, ID-based
  // events (per your Phase 3 ORDER_EVENTS convention) so it stays
  // decoupled from any particular consumer's data-shape needs. THIS
  // gateway is the one consumer that needs full order payloads for
  // socket clients, so it re-fetches via OrdersService.getOrderById
  // before broadcasting. Other future consumers (Kitchen Display,
  // Reports) can subscribe to the same lightweight events and fetch
  // only the fields they actually need.
  // ---------------------------------------------------------------------

  @OnEvent(ORDER_EVENTS.CREATED)
  async handleOrderCreated(event: OrderCreatedEvent) {
    const order = await this.fetchOrder(event.tenantId, event.orderId);
    this.server
      .to(this.roomFor(event.tenantId, event.branchId))
      .emit('order:created', order);
  }

  @OnEvent(ORDER_EVENTS.STATUS_UPDATED)
  async handleStatusUpdated(event: OrderStatusUpdatedEvent) {
    const order = await this.fetchOrder(event.tenantId, event.orderId);
    this.server
      .to(this.roomFor(event.tenantId, event.branchId))
      .emit('order:updated', order);
  }

  @OnEvent(ORDER_EVENTS.ITEMS_ADDED)
  async handleItemsAdded(event: OrderItemsAddedEvent) {
    const order = await this.fetchOrder(event.tenantId, event.orderId);
    this.server
      .to(this.roomFor(event.tenantId, event.branchId))
      .emit('order:items-added', { order, batchNumber: event.batchNumber });
  }

  @OnEvent(ORDER_EVENTS.PAID)
  async handleOrderPaid(event: OrderPaidEvent) {
    const order = await this.fetchOrder(event.tenantId, event.orderId);
    this.server
      .to(this.roomFor(event.tenantId, event.branchId))
      .emit('order:paid', order);
  }

  @OnEvent(ORDER_EVENTS.VOID_REFUND_REQUESTED)
  async handleVoidRefundRequested(event: OrderVoidRefundEvent) {
    this.server
      .to(this.roomFor(event.tenantId, event.branchId))
      .emit('order:void-refund-requested', {
        orderId: event.orderId,
        requestId: event.requestId,
        type: event.type,
      });
  }

  @OnEvent(ORDER_EVENTS.VOIDED)
  async handleVoided(event: OrderVoidRefundEvent) {
    const order = await this.fetchOrder(event.tenantId, event.orderId);
    this.server
      .to(this.roomFor(event.tenantId, event.branchId))
      .emit('order:voided-or-refunded', order);
  }

  @OnEvent(ORDER_EVENTS.REFUNDED)
  async handleRefunded(event: OrderVoidRefundEvent) {
    const order = await this.fetchOrder(event.tenantId, event.orderId);
    this.server
      .to(this.roomFor(event.tenantId, event.branchId))
      .emit('order:voided-or-refunded', order);
  }

  @OnEvent(ORDER_EVENTS.TABLE_STATUS_CHANGED)
  handleTableStatusChanged(event: TableStatusChangedEvent) {
    this.server
      .to(this.roomFor(event.tenantId, event.branchId))
      .emit('table:status-changed', {
        tableId: event.tableId,
        status: event.status,
      });
  }

  @OnEvent(ORDER_EVENTS.SYNC_CONFLICT_DETECTED)
  handleSyncConflictDetected(event: SyncConflictEvent) {
    this.server
      .to(this.roomFor(event.tenantId, event.branchId))
      .emit('sync:conflict-detected', {
        conflictId: event.conflictId,
        tableId: event.tableId,
        orderAId: event.orderAId,
        orderBId: event.orderBId,
      });
  }

  @OnEvent(ORDER_EVENTS.SYNC_CONFLICT_RESOLVED)
  handleSyncConflictResolved(event: SyncConflictEvent) {
    this.server
      .to(this.roomFor(event.tenantId, event.branchId))
      .emit('sync:conflict-resolved', {
        conflictId: event.conflictId,
      });
  }

  // Internal helper — constructs a minimal system RequestUser context to
  // call OrdersService.getOrderById, which still enforces RLS via
  // PrismaService.forTenant(event.tenantId, ...). No write path is
  // reachable from here.
  private async fetchOrder(tenantId: string, orderId: string) {
    return this.ordersService.getOrderById(
      {
        id: 'system-broadcast',
        tenantId,
        permissions: SYSTEM_BROADCAST_PERMISSIONS,
      },
      orderId,
    );
  }
}
