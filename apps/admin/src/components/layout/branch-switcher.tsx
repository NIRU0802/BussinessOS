"use client";

import { useAuth } from "@/lib/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import type { Branch } from "@/lib/types";

// Branch list is fetched by the parent (dashboard layout) via React Query
// and passed in, since it's needed by both the switcher and route guards.
interface BranchSwitcherProps {
  branches: Branch[];
  isLoading: boolean;
}

export function BranchSwitcher({ branches, isLoading }: BranchSwitcherProps) {
  const { activeBranchId, setActiveBranchId, session } = useAuth();
  const { hasPermission } = usePermissions();

  const canViewAllBranches = session?.isAllBranches && hasPermission("reports.read_all_branches");

  if (isLoading) {
    return <div className="h-9 w-40 animate-pulse rounded-md bg-slate-100" />;
  }

  if (branches.length <= 1 && !canViewAllBranches) {
    return null;
  }

  return (
    <select
      value={activeBranchId ?? "ALL"}
      onChange={(e) => setActiveBranchId(e.target.value === "ALL" ? null : e.target.value)}
      className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
    >
      {canViewAllBranches && <option value="ALL">All Branches</option>}
      {branches.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </select>
  );
}
