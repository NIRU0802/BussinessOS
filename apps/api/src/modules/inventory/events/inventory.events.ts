// Internal event name constants for cross-module communication via
// NestJS EventEmitter, consistent with ORDER_EVENTS (Phase 4) and
// WIDGET_EVENTS (Phase 3). Other modules subscribe to these instead of
// reaching into Inventory's repository directly.

export const INVENTORY_EVENTS = {
  LOW_STOCK: 'inventory.low_stock',
  STOCK_ADJUSTED: 'inventory.stock_adjusted',
} as const;

export interface InventoryLowStockEvent {
  tenantId: string;
  branchId: string;
  inventoryItemId: string;
  inventoryItemName: string;
  currentQuantity: string;
  lowStockThreshold: string;
  unit: string;
}

export interface InventoryStockAdjustedEvent {
  tenantId: string;
  branchId: string;
  inventoryItemId: string;
  changeAmount: string;
  movementType: 'purchase' | 'sale_deduction' | 'manual_adjustment' | 'waste';
  performedBy: string | null;
}
