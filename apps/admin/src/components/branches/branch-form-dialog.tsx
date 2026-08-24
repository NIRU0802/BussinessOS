"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { extractApiErrorMessage } from "@/lib/api-client";
import { createBranch, updateBranch } from "@/lib/api/branches-api";
import type { Branch } from "@/lib/types";

const schema = z.object({
  name: z.string().min(1, "Required").max(150),
  address: z.string().max(500).optional(),
  country: z
    .string()
    .regex(/^[A-Z]{2}$/, "Use a 2-letter ISO country code, e.g. IN")
    .optional()
    .or(z.literal("")),
  timezone: z.string().max(100).optional(),
});
type FormValues = z.infer<typeof schema>;

interface BranchFormDialogProps {
  open: boolean;
  branch: Branch | null;
  onClose: () => void;
  onSaved: () => void;
}

export function BranchFormDialog({ open, branch, onClose, onSaved }: BranchFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset({
        name: branch?.name ?? "",
        address: "",
        country: "IN",
        timezone: branch?.timezone ?? "Asia/Kolkata",
      });
    }
  }, [open, branch, reset]);

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const payload = { ...values, country: values.country || undefined };
      if (branch) {
        await updateBranch(branch.id, payload);
        toast.success("Branch updated");
      } else {
        await createBranch(payload);
        toast.success("Branch created");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} title={branch ? "Edit Branch" : "New Branch"} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Name" {...register("name")} error={errors.name?.message} />
        <Input label="Address" {...register("address")} error={errors.address?.message} />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Country code"
            placeholder="IN"
            maxLength={2}
            {...register("country")}
            error={errors.country?.message}
          />
          <Input
            label="Timezone"
            placeholder="Asia/Kolkata"
            {...register("timezone")}
            error={errors.timezone?.message}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
