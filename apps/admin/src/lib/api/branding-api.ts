import apiClient from "../api-client";

export interface Branding {
  businessName: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  primaryColorDark: string;
  inkColor: string;
  surfaceColor: string;
  fontDisplay: string;
  receiptFooterText: string | null;
}

export async function fetchBranding(): Promise<Branding> {
  const res = await apiClient.get<Branding>("/branding");
  return res.data;
}

export async function updateBranding(payload: Partial<Branding>): Promise<Branding> {
  const res = await apiClient.patch<Branding>("/branding", payload);
  return res.data;
}

export async function uploadBrandingLogo(file: File): Promise<Branding> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiClient.post<Branding>("/branding/logo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}
