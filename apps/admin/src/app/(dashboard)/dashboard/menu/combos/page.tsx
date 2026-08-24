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
import { ComboFormDialog } from "@/components/menu/combo-form-dialog";
import { listCombos, deleteCombo, type Combo } from "@/lib/api/menu-api";
import { formatCurrency } from "@/lib/utils";
import { extractApiErrorMessage } from "@/lib/api-client";

export default function CombosPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Combo | null>(null);
  const [deleting, setDeleting] = useState<Combo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: combos = [], isLoading } = useQuery({
    queryKey: ["combos"],
    queryFn: listCombos,
  });

  function refetch() {
    queryClient.invalidateQueries({ queryKey: ["combos"] });
  }

  async function handleDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await deleteCombo(deleting.id);
      toast.success("Combo deleted");
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
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            New Combo
          </Button>
        </PermissionGate>
      </div>

      <Card>
        <CardContent>
          {isLoading ? (
            <SkeletonRows count={4} />
          ) : combos.length === 0 ? (
            <EmptyState title="No combos" description="Create a combo meal deal." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {combos.map((combo) => (
                <li key={combo.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    {combo.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={combo.imageUrl}
                        alt={combo.name}
                        className="h-10 w-10 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-slate-100" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900">{combo.name}</p>
                      <p className="text-xs text-slate-500">
                        {formatCurrency(Number(combo.comboPrice), "INR")} · {combo.items.length}{" "}
                        items
                      </p>
                    </div>
                  </div>
                  <PermissionGate permission="menu.write">
                    <div className="flex gap-3">
                      <button
                        className="text-sm text-slate-600 hover:text-slate-900"
                        onClick={() => {
                          setEditing(combo);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-sm text-red-600 hover:text-red-800"
                        onClick={() => setDeleting(combo)}
                      >
                        Delete
                      </button>
                    </div>
                  </PermissionGate>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ComboFormDialog
        open={formOpen}
        combo={editing}
        onClose={() => setFormOpen(false)}
        onSaved={refetch}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete combo?"
        description={`This will remove "${deleting?.name}".`}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
