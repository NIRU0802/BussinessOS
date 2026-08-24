import apiClient from "../api-client";

export interface TaxClass {
  id: string;
  tenantId: string;
  name: string;
  ratePercent: string;
}

// Backend route currently gates on 'SETTINGS_VIEW' (inconsistent casing vs
// the rest of the permission catalog) — flagged for backend cleanup, not
// fixed here since this file only calls the route as it exists today.
export async function listTaxClasses(): Promise<TaxClass[]> {
  const res = await apiClient.get<TaxClass[]>("/tax/classes");
  return res.data;
}
