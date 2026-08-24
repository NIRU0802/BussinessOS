"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";

interface PermissionGateProps {
  permission: string | string[];
  mode?: "any" | "all";
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Hides children unless the logged-in user has the required permission(s).
 * Use this for buttons/sections that mutate data (e.g. "Create Staff") —
 * this is a UX guard only, the backend's PermissionsGuard is the real
 * enforcement point.
 */
export function PermissionGate({
  permission,
  mode = "any",
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission } = useAuth();
  const required = Array.isArray(permission) ? permission : [permission];

  const allowed =
    mode === "all"
      ? required.every((p) => hasPermission(p))
      : required.some((p) => hasPermission(p));

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
