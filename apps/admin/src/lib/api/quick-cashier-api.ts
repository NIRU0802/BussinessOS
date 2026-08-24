import apiClient from "../api-client";

export interface QuickCashierSetting {
  branchId: string;
  enabled: boolean;
}

export async function getQuickCashierSetting(branchId: string): Promise<QuickCashierSetting> {
  const res = await apiClient.get<QuickCashierSetting>("/quick-cashier/settings", {
    params: { branchId },
  });
  return res.data;
}

export async function setQuickCashierEnabled(
  branchId: string,
  enabled: boolean,
): Promise<QuickCashierSetting> {
  const res = await apiClient.post<QuickCashierSetting>("/quick-cashier/settings", {
    branchId,
    enabled,
  });
  return res.data;
}
