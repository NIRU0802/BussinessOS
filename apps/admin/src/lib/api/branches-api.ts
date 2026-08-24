import apiClient from "../api-client";
import type { Branch } from "../types";

export interface CreateBranchInput {
  name: string;
  address?: string;
  country?: string;
  timezone?: string;
}

export async function listBranches(): Promise<Branch[]> {
  const res = await apiClient.get<Branch[]>("/branches");
  return res.data;
}

export async function createBranch(input: CreateBranchInput): Promise<Branch> {
  const res = await apiClient.post<Branch>("/branches", input);
  return res.data;
}

export async function updateBranch(id: string, input: Partial<CreateBranchInput>): Promise<Branch> {
  const res = await apiClient.patch<Branch>(`/branches/${id}`, input);
  return res.data;
}

export async function deleteBranch(id: string): Promise<void> {
  await apiClient.delete(`/branches/${id}`);
}

// ---- Tables ----

export interface RestaurantTable {
  id: string;
  tenantId: string;
  branchId: string;
  label: string;
  capacity: number;
  status: string;
  mergedIntoTableId: string | null;
  qrTokenRotatedAt: string | null;
  isActive: boolean;
}

export interface CreateTableInput {
  label: string;
  capacity?: number;
}

export async function listTablesForBranch(branchId: string): Promise<RestaurantTable[]> {
  const res = await apiClient.get<RestaurantTable[]>("/tables", { params: { branchId } });
  return res.data;
}

export async function createTable(
  branchId: string,
  input: CreateTableInput,
): Promise<RestaurantTable> {
  const res = await apiClient.post<RestaurantTable>("/tables", input, {
    params: { branchId },
  });
  return res.data;
}

export async function updateTable(
  id: string,
  input: Partial<CreateTableInput>,
): Promise<RestaurantTable> {
  const res = await apiClient.patch<RestaurantTable>(`/tables/${id}`, input);
  return res.data;
}

export async function deleteTable(id: string): Promise<void> {
  await apiClient.delete(`/tables/${id}`);
}

export interface QrTokenResponse {
  token: string;
  qrUrl?: string;
  rotatedAt?: string;
}

export async function getTableQrToken(tableId: string): Promise<QrTokenResponse> {
  const res = await apiClient.get<QrTokenResponse>(`/tables/${tableId}/qr`);
  return res.data;
}

export async function rotateTableQrToken(tableId: string): Promise<QrTokenResponse> {
  const res = await apiClient.post<QrTokenResponse>(`/tables/${tableId}/qr/rotate`);
  return res.data;
}
