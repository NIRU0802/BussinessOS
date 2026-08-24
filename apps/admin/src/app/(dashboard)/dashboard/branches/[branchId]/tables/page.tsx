"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";
import { TableFormDialog } from "@/components/branches/table-form-dialog";
import { QrCodePanel } from "@/components/branches/qr-code-panel";
import { listTablesForBranch, deleteTable, type RestaurantTable } from "@/lib/api/branches-api";
import { extractApiErrorMessage } from "@/lib/api-client";

export default function BranchTablesPage() {
  const params = useParams<{ branchId: string }>();
  const branchId = params.branchId;
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RestaurantTable | null>(null);
  const [deleting, setDeleting] = useState<RestaurantTable | null>(null);
  const [qrTable, setQrTable] = useState<RestaurantTable | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ["branch-tables", branchId],
    queryFn: () => listTablesForBranch(branchId),
  });

  function refetch() {
    queryClient.invalidateQueries({ queryKey: ["branch-tables", branchId] });
  }

  async function handleDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await deleteTable(deleting.id);
      toast.success("Table deleted");
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Tables</h1>
        <PermissionGate permission="tables.write">
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            New Table
          </Button>
        </PermissionGate>
      </div>

      <Card>
        <CardContent>
          {isLoading ? (
            <SkeletonRows count={4} />
          ) : tables.length === 0 ? (
            <EmptyState title="No tables" description="Add tables for this branch." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {tables.map((table) => (
                <li key={table.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{table.label}</p>
                    <p className="text-xs text-slate-500">
                      Seats {table.capacity} · {table.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <PermissionGate permission="tables.manage">
                      <button
                        className="text-sm text-slate-600 hover:text-slate-900"
                        onClick={() => setQrTable(table)}
                      >
                        QR Code
                      </button>
                    </PermissionGate>
                    <PermissionGate permission="tables.write">
                      <button
                        className="text-sm text-slate-600 hover:text-slate-900"
                        onClick={() => {
                          setEditing(table);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-sm text-red-600 hover:text-red-800"
                        onClick={() => setDeleting(table)}
                      >
                        Delete
                      </button>
                    </PermissionGate>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <TableFormDialog
        open={formOpen}
        branchId={branchId}
        table={editing}
        onClose={() => setFormOpen(false)}
        onSaved={refetch}
      />

      <QrCodePanel table={qrTable} onClose={() => setQrTable(null)} />

      <ConfirmDialog
        open={!!deleting}
        title="Delete table?"
        description={`This will remove "${deleting?.label}".`}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
