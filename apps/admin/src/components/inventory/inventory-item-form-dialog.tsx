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
import {
  createInventoryItem,
  updateInventoryItem,
  type InventoryItem,
} from "@/lib/api/inventory-api";

const schema = z.object({
  name: z.string().min(1, "Required"),
  unit: z.string().min(1, "Required"),
  costPerUnit: z.coerce.number().min(0),
});
type FormValues = z.infer<typeof schema>;

interface InventoryItemFormDialogProps {
  open: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export function InventoryItemFormDialog({
  open,
  item,
  onClose,
  onSaved,
}: InventoryItemFormDialogProps) {
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
        name: item?.name ?? "",
        unit: item?.unit ?? "",
        costPerUnit: item ? Number(item.costPerUnit) : 0,
      });
    }
  }, [open, item, reset]);

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      if (item) {
        await updateInventoryItem(item.id, values);
        toast.success("Item updated");
      } else {
        await createInventoryItem(values);
        toast.success("Item created");
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
    <Modal
      open={open}
      title={item ? "Edit Inventory Item" : "New Inventory Item"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Name"
          placeholder="Tomatoes"
          {...register("name")}
          error={errors.name?.message}
        />
        <Input label="Unit" placeholder="kg" {...register("unit")} error={errors.unit?.message} />
        <Input
          label="Cost per unit"
          type="number"
          step="0.01"
          {...register("costPerUnit")}
          error={errors.costPerUnit?.message}
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
