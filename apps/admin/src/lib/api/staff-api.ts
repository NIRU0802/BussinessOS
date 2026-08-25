import apiClient from "../api-client";

export interface StaffUser {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isActive: boolean;
  isAllBranches: boolean;
  lastLoginAt: string | null;
  roles: { role: { id: string; name: string } }[];
}

export interface CreateStaffUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: string;
  isAllBranches?: boolean;
  branchIds?: string[];
}

export interface UpdateStaffUserInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  roleId?: string;
  isAllBranches?: boolean;
  branchIds?: string[];
}

export interface ChangeOwnPasswordInput {
  currentPassword: string;
  newPassword: string;
}

export async function listStaff(): Promise<StaffUser[]> {
  const res = await apiClient.get<StaffUser[]>("/staff");
  return res.data;
}

export async function createStaffUser(input: CreateStaffUserInput): Promise<StaffUser> {
  const res = await apiClient.post<StaffUser>("/staff", input);
  return res.data;
}

export async function updateStaffUser(id: string, input: UpdateStaffUserInput): Promise<StaffUser> {
  const res = await apiClient.patch<StaffUser>(`/staff/${id}`, input);
  return res.data;
}

export async function deactivateStaffUser(id: string): Promise<StaffUser> {
  const res = await apiClient.patch<StaffUser>(`/staff/${id}/deactivate`);
  return res.data;
}

export async function reactivateStaffUser(id: string): Promise<StaffUser> {
  const res = await apiClient.patch<StaffUser>(`/staff/${id}/reactivate`);
  return res.data;
}

export async function changeOwnPassword(
  input: ChangeOwnPasswordInput,
): Promise<{ success: boolean }> {
  const res = await apiClient.post<{ success: boolean }>("/staff/me/change-password", input);
  return res.data;
}
