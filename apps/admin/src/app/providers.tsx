"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { QueryProvider } from "@/components/providers/query-provider";
import { ToastProvider } from "@/components/providers/toast-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        {children}
        <ToastProvider />
      </AuthProvider>
    </QueryProvider>
  );
}
