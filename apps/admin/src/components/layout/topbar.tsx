"use client";

import { useAuth } from "@/lib/auth-context";
import { getInitials } from "@/lib/utils";
import type { Branch } from "@/lib/types";
import { BranchSwitcher } from "./branch-switcher";

interface TopbarProps {
  branches: Branch[];
  branchesLoading: boolean;
}

export function Topbar({ branches, branchesLoading }: TopbarProps) {
  const { user, tenant, logout } = useAuth();

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-5">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-slate-900">{tenant?.name ?? "Business OS"}</span>
        <BranchSwitcher branches={branches} isLoading={branchesLoading} />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
            {user ? getInitials(user.firstName, user.lastName) : "—"}
          </div>
          <span className="text-sm text-slate-700">
            {user ? `${user.firstName} ${user.lastName}` : "Signed in"}
          </span>
        </div>
        <button
          onClick={() => logout()}
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
