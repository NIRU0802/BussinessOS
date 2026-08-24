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
import { createTable, updateTable, type RestaurantTable } from "@/lib/api/branches-api";

const schema = z.object({
  label: z.string().min(1, "Required").max(50),
  capacity: z.coerce.number().int().min(1),
});
type FormValues = z.infer<typeof schema>;

interface TableFormDialogProps {
  open: boolean;
  branchId: string;
  table: RestaurantTable | null;
  onClose: () => void;
  onSaved: () => void;
}

export function TableFormDialog({ open, branchId, table, onClose, onSaved }: TableFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset({ label: table?.label ?? "", capacity: table?.capacity ?? 2 });
    }
  }, [open, table, reset]);

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      if (table) {
        await updateTable(table.id, values);
        toast.success("Table updated");
      } else {
        await createTable(branchId, values);
        toast.success("Table created");
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
    <Modal open={open} title={table ? "Edit Table" : "New Table"} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Label"
          placeholder="T1"
          {...register("label")}
          error={errors.label?.message}
        />
        <Input
          label="Capacity"
          type="number"
          {...register("capacity")}
          error={errors.capacity?.message}
        />
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
