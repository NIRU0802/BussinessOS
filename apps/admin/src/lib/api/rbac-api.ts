import apiClient from "../api-client";

export const ROLE_NAMES = [
  "OWNER",
  "MANAGER",
  "CASHIER",
  "CHEF",
  "KITCHEN_STAFF",
  "WAREHOUSE",
  "ACCOUNTANT",
  "DELIVERY_RIDER",
  "CUSTOMER",
] as const;
export type RoleName = (typeof ROLE_NAMES)[number];

export interface Role {
  id: string;
  tenantId: string;
  name: RoleName;
  description: string | null;
  isSystem: boolean;
  permissions: { permission: { id: string; key: string; module: string } }[];
}

export interface CreateRoleInput {
  name: RoleName;
  description?: string;
  permissionKeys: string[];
}

export async function listRoles(): Promise<Role[]> {
  const res = await apiClient.get<Role[]>("/roles");
  return res.data;
}

export async function createRole(input: CreateRoleInput): Promise<Role> {
  const res = await apiClient.post<Role>("/roles", input);
  return res.data;
}

export async function assignRoleToUser(userId: string, roleId: string): Promise<void> {
  await apiClient.post("/roles/assign", { userId, roleId });
}

export async function revokeRoleFromUser(userId: string, roleId: string): Promise<void> {
  await apiClient.delete(`/roles/${userId}/${roleId}`);
}
