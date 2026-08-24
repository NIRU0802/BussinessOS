"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import apiClient from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PermissionGate } from "@/components/shared/permission-gate";
import { BranchOverridePanel } from "@/components/menu/branch-override-panel";
import { listMenuItems, listBranchOverrides } from "@/lib/api/menu-api";
import type { Branch } from "@/lib/types";

async function fetchBranches(): Promise<Branch[]> {
  const res = await apiClient.get<Branch[]>("/branches");
  return res.data;
}

export default function BranchOverridesPage() {
  const queryClient = useQueryClient();
  const { activeBranchId, session } = useAuth();
  const effectiveBranchId = activeBranchId ?? session?.branchIds[0] ?? null;

  const { data: branches = [] } = useQuery({ queryKey: ["branches"], queryFn: fetchBranches });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["menu-items", ""],
    queryFn: () => listMenuItems(),
  });

  const { data: overrides = [], isLoading: overridesLoading } = useQuery({
    queryKey: ["branch-overrides", effectiveBranchId],
    queryFn: () => listBranchOverrides(effectiveBranchId!),
    enabled: !!effectiveBranchId,
  });

  function refetch() {
    queryClient.invalidateQueries({ queryKey: ["branch-overrides", effectiveBranchId] });
  }

  const branchName = branches.find((b) => b.id === effectiveBranchId)?.name;

  if (!effectiveBranchId) {
    return (
      <EmptyState title="No branch selected" description="Select a branch to edit overrides." />
    );
  }

  return (
    <PermissionGate
      permission="menu.write"
      fallback={
        <EmptyState
          title="No access"
          description="You don't have permission to manage branch overrides."
        />
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Editing overrides for <span className="font-medium text-slate-900">{branchName}</span>.
          Use the branch switcher in the top bar to change branches.
        </p>

        <Card>
          <CardContent>
            {itemsLoading || overridesLoading ? (
              <SkeletonRows count={6} />
            ) : items.length === 0 ? (
              <EmptyState
                title="No menu items"
                description="Create items first under Menu → Items."
              />
            ) : (
              <div>
                {items.map((item) => (
                  <BranchOverridePanel
                    key={item.id}
                    branchId={effectiveBranchId}
                    item={item}
                    override={overrides.find((o) => o.menuItemId === item.id)}
                    onSaved={refetch}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
}
