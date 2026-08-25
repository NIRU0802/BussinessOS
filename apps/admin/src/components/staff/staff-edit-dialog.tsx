"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { extractApiErrorMessage } from "@/lib/api-client";
import { updateStaffUser, type StaffUser } from "@/lib/api/staff-api";
import { listRoles } from "@/lib/api/rbac-api";
import { listBranches } from "@/lib/api/branches-api";

const schema = z.object({
  firstName: z.string().min(1, "Required").max(100),
  lastName: z.string().min(1, "Required").max(100),
  phone: z.string().max(20).optional(),
  roleId: z.string().uuid("Select a role"),
  isAllBranches: z.boolean(),
  branchIds: z.array(z.string()),
});
type FormValues = z.infer<typeof schema>;

interface StaffEditDialogProps {
  staffUser: StaffUser | null;
  onClose: () => void;
  onSaved: () => void;
}

export function StaffEditDialog({ staffUser, onClose, onSaved }: StaffEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const open = !!staffUser;

  const { data: roles = [] } = useQuery({ queryKey: ["roles"], queryFn: listRoles, enabled: open });
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: listBranches,
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      roleId: "",
      isAllBranches: false,
      branchIds: [],
    },
  });

  useEffect(() => {
    if (staffUser) {
      reset({
        firstName: staffUser.firstName,
        lastName: staffUser.lastName,
        phone: staffUser.phone ?? "",
        roleId: staffUser.roles[0]?.role.id ?? "",
        isAllBranches: staffUser.isAllBranches,
        branchIds: [],
      });
    }
  }, [staffUser, reset]);

  const isAllBranches = watch("isAllBranches");
  const selectedBranchIds = watch("branchIds");

  function toggleBranch(branchId: string) {
    const current = selectedBranchIds ?? [];
    setValue(
      "branchIds",
      current.includes(branchId) ? current.filter((b) => b !== branchId) : [...current, branchId],
    );
  }

  async function onSubmit(values: FormValues) {
    if (!staffUser) return;
    setIsSubmitting(true);
    try {
      await updateStaffUser(staffUser.id, {
        ...values,
        phone: values.phone || undefined,
        branchIds: values.isAllBranches ? undefined : values.branchIds,
      });
      toast.success("Staff member updated");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} title="Edit Staff Member" onClose={onClose} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="First name" {...register("firstName")} error={errors.firstName?.message} />
          <Input label="Last name" {...register("lastName")} error={errors.lastName?.message} />
        </div>
        <Input label="Phone" {...register("phone")} error={errors.phone?.message} />

        <Select label="Role" {...register("roleId")} error={errors.roleId?.message}>
          <option value="">Select role</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" {...register("isAllBranches")} />
          Access all branches
        </label>

        {!isAllBranches && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Branch access</p>
            <div className="flex flex-wrap gap-2">
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggleBranch(b.id)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                    selectedBranchIds?.includes(b.id)
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 text-slate-600"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
