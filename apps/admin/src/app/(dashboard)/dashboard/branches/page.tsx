"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";
import { BranchFormDialog } from "@/components/branches/branch-form-dialog";
import { listBranches, deleteBranch } from "@/lib/api/branches-api";
import type { Branch } from "@/lib/types";
import { extractApiErrorMessage } from "@/lib/api-client";

export default function BranchesPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState<Branch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: listBranches,
  });

  function refetch() {
    queryClient.invalidateQueries({ queryKey: ["branches"] });
  }

  async function handleDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await deleteBranch(deleting.id);
      toast.success("Branch deleted");
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
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Branches</h1>
          <p className="text-sm text-slate-500">Manage locations, timezones, and tables.</p>
        </div>
        <PermissionGate permission="branches.write">
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            New Branch
          </Button>
        </PermissionGate>
      </div>

      <Card>
        <CardContent>
          {isLoading ? (
            <SkeletonRows count={4} />
          ) : branches.length === 0 ? (
            <EmptyState title="No branches" description="Create your first branch." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {branches.map((branch) => (
                <li key={branch.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{branch.name}</p>
                    <p className="text-xs text-slate-500">{branch.timezone}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/dashboard/branches/${branch.id}/tables`}
                      className="text-sm text-slate-600 hover:text-slate-900"
                    >
                      Tables
                    </Link>
                    <PermissionGate permission="branches.write">
                      <button
                        className="text-sm text-slate-600 hover:text-slate-900"
                        onClick={() => {
                          setEditing(branch);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-sm text-red-600 hover:text-red-800"
                        onClick={() => setDeleting(branch)}
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

      <BranchFormDialog
        open={formOpen}
        branch={editing}
        onClose={() => setFormOpen(false)}
        onSaved={refetch}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete branch?"
        description={`This will remove "${deleting?.name}". This cannot be undone.`}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
