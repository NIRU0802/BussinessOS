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
import { createStaffUser } from "@/lib/api/staff-api";
import { listRoles } from "@/lib/api/rbac-api";
import { listBranches } from "@/lib/api/branches-api";

const schema = z.object({
  email: z.string().email("Enter a valid email").max(255),
  password: z
    .string()
    .min(10, "At least 10 characters")
    .max(128)
    .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Needs lowercase, uppercase, and a number"),
  firstName: z.string().min(1, "Required").max(100),
  lastName: z.string().min(1, "Required").max(100),
  phone: z.string().max(20).optional(),
  roleId: z.string().uuid("Select a role"),
  isAllBranches: z.boolean(),
  branchIds: z.array(z.string()),
});
type FormValues = z.infer<typeof schema>;

interface StaffFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function StaffFormDialog({ open, onClose, onSaved }: StaffFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
      roleId: "",
      isAllBranches: false,
      branchIds: [],
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phone: "",
        roleId: "",
        isAllBranches: false,
        branchIds: [],
      });
    }
  }, [open, reset]);

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
    setIsSubmitting(true);
    try {
      await createStaffUser({
        ...values,
        phone: values.phone || undefined,
        branchIds: values.isAllBranches ? undefined : values.branchIds,
      });
      toast.success("Staff member created");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} title="New Staff Member" onClose={onClose} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="First name" {...register("firstName")} error={errors.firstName?.message} />
          <Input label="Last name" {...register("lastName")} error={errors.lastName?.message} />
        </div>
        <Input label="Email" type="email" {...register("email")} error={errors.email?.message} />
        <Input
          label="Temporary password"
          type="password"
          {...register("password")}
          error={errors.password?.message}
        />
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
            Create staff member
          </Button>
        </div>
      </form>
    </Modal>
  );
}
