"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";
import { ModifierGroupFormDialog } from "@/components/menu/modifier-group-form-dialog";
import { listModifierGroups, deleteModifierGroup, type ModifierGroup } from "@/lib/api/menu-api";
import { formatCurrency } from "@/lib/utils";
import { extractApiErrorMessage } from "@/lib/api-client";

export default function ModifierGroupsPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<ModifierGroup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["modifier-groups"],
    queryFn: listModifierGroups,
  });

  function refetch() {
    queryClient.invalidateQueries({ queryKey: ["modifier-groups"] });
  }

  async function handleDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await deleteModifierGroup(deleting.id);
      toast.success("Modifier group deleted");
      refetch();
      setDeleting(null);
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <PermissionGate permission="menu.write">
          <Button onClick={() => setFormOpen(true)}>New Modifier Group</Button>
        </PermissionGate>
      </div>

      {isLoading ? (
        <SkeletonRows count={4} />
      ) : groups.length === 0 ? (
        <EmptyState title="No modifier groups" description="Create one to attach to menu items." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardContent>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{group.name}</p>
                    <p className="text-xs text-slate-500">
                      {group.isRequired ? "Required" : "Optional"} · select {group.minSelect}-
                      {group.maxSelect}
                    </p>
                  </div>
                  <PermissionGate permission="menu.write">
                    <button
                      className="text-sm text-red-600 hover:text-red-800"
                      onClick={() => setDeleting(group)}
                    >
                      Delete
                    </button>
                  </PermissionGate>
                </div>
                <ul className="mt-3 space-y-1">
                  {group.options.map((opt) => (
                    <li key={opt.id} className="flex justify-between text-sm text-slate-600">
                      <span>{opt.name}</span>
                      <span>{formatCurrency(Number(opt.priceDelta), "INR")}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ModifierGroupFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refetch}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete modifier group?"
        description={`This will remove "${deleting?.name}" from all attached items.`}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
