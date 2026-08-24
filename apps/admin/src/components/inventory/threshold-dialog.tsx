"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { extractApiErrorMessage } from "@/lib/api-client";
import { setLowStockThreshold, type InventoryItem } from "@/lib/api/inventory-api";

const schema = z.object({
  lowStockThreshold: z.coerce.number().min(0),
});
type FormValues = z.infer<typeof schema>;

interface ThresholdDialogProps {
  open: boolean;
  branchId: string;
  item: InventoryItem | null;
  currentThreshold?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function ThresholdDialog({
  open,
  branchId,
  item,
  currentThreshold,
  onClose,
  onSaved,
}: ThresholdDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: { lowStockThreshold: currentThreshold ? Number(currentThreshold) : 0 },
  });

  async function onSubmit(values: FormValues) {
    if (!item) return;
    setIsSubmitting(true);
    try {
      await setLowStockThreshold(branchId, item.id, values.lowStockThreshold);
      toast.success("Threshold updated");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!item) return null;

  return (
    <Modal open={open} title={`Low Stock Threshold — ${item.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label={`Threshold (${item.unit})`}
          type="number"
          step="0.001"
          {...register("lowStockThreshold")}
          error={errors.lowStockThreshold?.message}
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
