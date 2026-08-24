import apiClient from "../api-client";
import type { TableStatus } from "../enums";

export interface RestaurantTable {
  id: string;
  tenantId: string;
  branchId: string;
  label: string;
  capacity: number;
  status: TableStatus;
  mergedIntoTableId: string | null;
  isActive: boolean;
}

export async function listTables(branchId: string): Promise<RestaurantTable[]> {
  const res = await apiClient.get<RestaurantTable[]>("/tables", {
    params: { branchId },
  });
  return res.data;
}
