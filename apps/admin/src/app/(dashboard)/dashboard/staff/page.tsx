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
import { useAuth } from "@/lib/auth-context";
import { StaffFormDialog } from "@/components/staff/staff-form-dialog";
import { QuickCashierToggle } from "@/components/staff/quick-cashier-toggle";
import { listStaff, deactivateStaffUser, type StaffUser } from "@/lib/api/staff-api";
import { extractApiErrorMessage } from "@/lib/api-client";

export default function StaffPage() {
  const queryClient = useQueryClient();
  const { activeBranchId, session } = useAuth();
  const effectiveBranchId = activeBranchId ?? session?.branchIds[0] ?? null;

  const [formOpen, setFormOpen] = useState(false);
  const [deactivating, setDeactivating] = useState<StaffUser | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const { data: staff = [], isLoading } = useQuery({ queryKey: ["staff"], queryFn: listStaff });

  function refetch() {
    queryClient.invalidateQueries({ queryKey: ["staff"] });
  }

  async function handleDeactivate() {
    if (!deactivating) return;
    setIsDeactivating(true);
    try {
      await deactivateStaffUser(deactivating.id);
      toast.success("Staff member deactivated");
      refetch();
      setDeactivating(null);
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsDeactivating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Staff</h1>
          <p className="text-sm text-slate-500">Manage team members and access.</p>
        </div>
        <div className="flex items-center gap-3">
          <PermissionGate permission="staff.read">
            <Link
              href="/dashboard/staff/roles"
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Manage Roles
            </Link>
          </PermissionGate>
          <PermissionGate permission="staff.write">
            <Button onClick={() => setFormOpen(true)}>New Staff Member</Button>
          </PermissionGate>
        </div>
      </div>

      <Card>
        <CardContent>
          {isLoading ? (
            <SkeletonRows count={5} />
          ) : staff.length === 0 ? (
            <EmptyState title="No staff members" description="Add your first team member." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {staff.map((member) => (
                <li key={member.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {member.firstName} {member.lastName}
                      {!member.isActive && (
                        <span className="ml-2 text-xs text-slate-400">Inactive</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {member.email} · {member.roles.map((r) => r.role.name).join(", ")}
                    </p>
                  </div>
                  {member.isActive && (
                    <PermissionGate permission="staff.write">
                      <button
                        className="text-sm text-red-600 hover:text-red-800"
                        onClick={() => setDeactivating(member)}
                      >
                        Deactivate
                      </button>
                    </PermissionGate>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {effectiveBranchId && <QuickCashierToggle branchId={effectiveBranchId} />}

      <StaffFormDialog open={formOpen} onClose={() => setFormOpen(false)} onSaved={refetch} />

      <ConfirmDialog
        open={!!deactivating}
        title="Deactivate staff member?"
        description={`${deactivating?.firstName} ${deactivating?.lastName} will lose access immediately.`}
        isLoading={isDeactivating}
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivating(null)}
      />
    </div>
  );
}
