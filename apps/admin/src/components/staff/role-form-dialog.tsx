"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { extractApiErrorMessage } from "@/lib/api-client";
import { createRole, ROLE_NAMES, type Role, type RoleName } from "@/lib/api/rbac-api";
import { groupPermissionsByModule } from "@/lib/permission-catalog";

const schema = z.object({
  name: z.enum(ROLE_NAMES),
  description: z.string().max(255).optional(),
  permissionKeys: z.array(z.string()).min(1, "Select at least one permission"),
});
type FormValues = z.infer<typeof schema>;

interface RoleFormDialogProps {
  open: boolean;
  existingRoles: Role[];
  onClose: () => void;
  onSaved: () => void;
}

export function RoleFormDialog({ open, existingRoles, onClose, onSaved }: RoleFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const grouped = groupPermissionsByModule();
  const existingNames = new Set(existingRoles.map((r) => r.name));
  const availableNames = ROLE_NAMES.filter((n) => !existingNames.has(n));

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: availableNames[0], description: "", permissionKeys: [] },
  });

  const selectedPermissions = watch("permissionKeys") ?? [];

  function togglePermission(key: string) {
    setValue(
      "permissionKeys",
      selectedPermissions.includes(key)
        ? selectedPermissions.filter((k) => k !== key)
        : [...selectedPermissions, key],
    );
  }

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      await createRole(
        values as { name: RoleName; description?: string; permissionKeys: string[] },
      );
      toast.success("Role created");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (availableNames.length === 0) {
    return (
      <Modal open={open} title="New Role" onClose={onClose}>
        <p className="text-sm text-slate-600">
          All available role slots ({ROLE_NAMES.join(", ")}) have already been created for this
          tenant. Each tenant may only have one role per name.
        </p>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} title="New Role" onClose={onClose} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select label="Role name" {...register("name")}>
          {availableNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Select>
        <Input
          label="Description"
          {...register("description")}
          error={errors.description?.message}
        />

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Permissions</p>
          <div className="max-h-80 space-y-4 overflow-y-auto rounded-md border border-slate-200 p-3">
            {Object.entries(grouped).map(([module, perms]) => (
              <div key={module}>
                <p className="mb-1 text-xs font-semibold uppercase text-slate-400">{module}</p>
                <div className="space-y-1">
                  {perms.map((p) => (
                    <label key={p.key} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(p.key)}
                        onChange={() => togglePermission(p.key)}
                      />
                      <span>{p.description}</span>
                      <span className="text-xs text-slate-400">({p.key})</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {errors.permissionKeys?.message && (
            <p className="mt-1 text-sm text-red-600">{errors.permissionKeys.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create role
          </Button>
        </div>
      </form>
    </Modal>
  );
}
