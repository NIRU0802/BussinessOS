// Internal event name constants for cross-module communication via
// NestJS EventEmitter, consistent with the pattern used in your Widget
// Registry (Phase 3). Other modules (Kitchen Display, Reports, CRM in
// later phases) subscribe to these instead of reaching into Orders'
// repository directly — preserving strict module boundaries per the
// locked architecture.

export const ORDER_EVENTS = {
  CREATED: 'order.created',
  ITEMS_ADDED: 'order.items_added',
  STATUS_UPDATED: 'order.status_updated',
  PAID: 'order.paid',
  VOID_REFUND_REQUESTED: 'order.void_refund_requested',
  VOID_REFUND_APPROVED: 'order.void_refund_approved',
  VOIDED: 'order.voided',
  REFUNDED: 'order.refunded',
  SYNC_CONFLICT_DETECTED: 'order.sync_conflict_detected',
  SYNC_CONFLICT_RESOLVED: 'order.sync_conflict_resolved',
  // ADDED for Phase 4 Socket.IO table-status broadcast to Mobile
  // (per spec: Mobile needs real-time table-busy state). Not part of
  // your original Phase 3 list — flag if this should live elsewhere.
  TABLE_STATUS_CHANGED: 'table.status_changed',
} as const;

export interface OrderCreatedEvent {
  tenantId: string;
  branchId: string;
  orderId: string;
  channel: string;
  tableId: string | null;
}

export interface OrderItemsAddedEvent {
  tenantId: string;
  branchId: string;
  orderId: string;
  batchNumber: number;
}

export interface OrderStatusUpdatedEvent {
  tenantId: string;
  branchId: string;
  orderId: string;
  status: string;
}

export interface OrderPaidEvent {
  tenantId: string;
  branchId: string;
  orderId: string;
  total: string;
}

export interface OrderVoidRefundEvent {
  tenantId: string;
  branchId: string;
  orderId: string;
  requestId: string;
  type: 'void' | 'refund';
  decidedBy?: string;
}

export interface SyncConflictEvent {
  tenantId: string;
  branchId: string;
  conflictId: string;
  tableId: string;
  orderAId: string;
  orderBId: string;
}

// ADDED alongside TABLE_STATUS_CHANGED above.
export interface TableStatusChangedEvent {
  tenantId: string;
  branchId: string;
  tableId: string;
  status: 'busy' | 'available';
}
