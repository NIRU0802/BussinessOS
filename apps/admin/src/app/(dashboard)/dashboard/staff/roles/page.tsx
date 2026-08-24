"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PermissionGate } from "@/components/shared/permission-gate";
import { RoleFormDialog } from "@/components/staff/role-form-dialog";
import { listRoles } from "@/lib/api/rbac-api";

export default function RolesPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);

  const { data: roles = [], isLoading } = useQuery({ queryKey: ["roles"], queryFn: listRoles });

  function refetch() {
    queryClient.invalidateQueries({ queryKey: ["roles"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Roles</h1>
        <PermissionGate permission="staff.write">
          <Button onClick={() => setFormOpen(true)}>New Role</Button>
        </PermissionGate>
      </div>

      {isLoading ? (
        <SkeletonRows count={4} />
      ) : roles.length === 0 ? (
        <EmptyState title="No roles yet" description="Create a role to assign to staff." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {roles.map((role) => (
            <Card key={role.id}>
              <CardContent>
                <p className="text-sm font-semibold text-slate-900">{role.name}</p>
                {role.description && <p className="text-xs text-slate-500">{role.description}</p>}
                <p className="mt-2 text-xs text-slate-400">
                  {role.permissions.length} permission{role.permissions.length === 1 ? "" : "s"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RoleFormDialog
        open={formOpen}
        existingRoles={roles}
        onClose={() => setFormOpen(false)}
        onSaved={refetch}
      />
    </div>
  );
}
