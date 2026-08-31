"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";

interface Branding {
  primaryColor: string;
  primaryColorDark: string;
  inkColor: string;
  surfaceColor: string;
  fontDisplay: string;
  businessName: string | null;
  faviconUrl: string | null;
}

async function fetchBranding(): Promise<Branding> {
  const res = await apiClient.get<Branding>("/branding");
  return res.data;
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { data: branding } = useQuery({
    queryKey: ["branding"],
    queryFn: fetchBranding,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (!branding) return;
    const root = document.documentElement;
    root.style.setProperty("--color-primary", branding.primaryColor);
    root.style.setProperty("--color-primary-dark", branding.primaryColorDark);
    root.style.setProperty("--color-ink", branding.inkColor);
    root.style.setProperty("--color-surface", branding.surfaceColor);
    root.style.setProperty("--font-display", branding.fontDisplay);
    if (branding.businessName) document.title = branding.businessName;
  }, [branding]);

  return <>{children}</>;
}
