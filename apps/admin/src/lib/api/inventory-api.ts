import apiClient from "../api-client";

// ---- Inventory Items (the catalog of trackable ingredients/supplies) ----

export interface InventoryItem {
  id: string;
  tenantId: string;
  name: string;
  unit: string;
  costPerUnit: string;
  isActive: boolean;
}

export interface CreateInventoryItemInput {
  name: string;
  unit: string;
  costPerUnit: number;
  isActive?: boolean;
}

export async function listInventoryItems(includeInactive = false): Promise<InventoryItem[]> {
  const res = await apiClient.get<InventoryItem[]>("/inventory/items", {
    params: includeInactive ? { includeInactive: "true" } : undefined,
  });
  return res.data;
}

export async function createInventoryItem(input: CreateInventoryItemInput): Promise<InventoryItem> {
  const res = await apiClient.post<InventoryItem>("/inventory/items", input);
  return res.data;
}

export async function updateInventoryItem(
  id: string,
  input: Partial<CreateInventoryItemInput>,
): Promise<InventoryItem> {
  const res = await apiClient.patch<InventoryItem>(`/inventory/items/${id}`, input);
  return res.data;
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await apiClient.delete(`/inventory/items/${id}`);
}

// ---- Stock Levels (per-branch quantity for each item) ----

export interface StockLevel {
  id: string;
  tenantId: string;
  branchId: string;
  inventoryItemId: string;
  currentQuantity: string;
  lowStockThreshold: string;
  updatedAt: string;
  inventoryItem: InventoryItem;
}

// NOTE: exact return shape of GET /inventory/stock (listForBranch) wasn't
// directly confirmed — inferred consistent with the getLowStockSummary
// query pattern (stockLevel rows with `inventoryItem` included). If the
// branch stock list screen shows odd data, verify stock.service.ts's
// listForBranch method against this shape.
export async function listStockForBranch(branchId: string): Promise<StockLevel[]> {
  const res = await apiClient.get<StockLevel[]>("/inventory/stock", {
    params: { branchId },
  });
  return res.data;
}

export interface LowStockItem {
  branchId: string;
  inventoryItemId: string;
  inventoryItemName: string;
  unit: string;
  currentQuantity: string;
  lowStockThreshold: string;
}

export async function getLowStockSummary(branchId?: string): Promise<LowStockItem[]> {
  const res = await apiClient.get<LowStockItem[]>("/inventory/stock/low-stock", {
    params: branchId ? { branchId } : undefined,
  });
  return res.data;
}

export type ManualStockMovementType = "purchase" | "manual_adjustment" | "waste";

export interface AdjustStockInput {
  branchId: string;
  inventoryItemId: string;
  changeAmount: number;
  movementType: ManualStockMovementType;
  reason: string;
}

export async function adjustStock(input: AdjustStockInput): Promise<StockLevel> {
  const res = await apiClient.post<StockLevel>("/inventory/stock/adjust", input);
  return res.data;
}

export async function setLowStockThreshold(
  branchId: string,
  inventoryItemId: string,
  lowStockThreshold: number,
): Promise<StockLevel> {
  const res = await apiClient.patch<StockLevel>("/inventory/stock/threshold", {
    branchId,
    inventoryItemId,
    lowStockThreshold,
  });
  return res.data;
}
