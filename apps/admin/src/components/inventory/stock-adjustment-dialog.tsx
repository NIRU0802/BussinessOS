"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { extractApiErrorMessage } from "@/lib/api-client";
import {
  adjustStock,
  type InventoryItem,
  type ManualStockMovementType,
} from "@/lib/api/inventory-api";

const schema = z.object({
  changeAmount: z.coerce.number().refine((v) => v !== 0, "Cannot be zero"),
  movementType: z.enum(["purchase", "manual_adjustment", "waste"]),
  reason: z.string().min(3, "At least 3 characters"),
});
type FormValues = z.infer<typeof schema>;

interface StockAdjustmentDialogProps {
  open: boolean;
  branchId: string;
  item: InventoryItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export function StockAdjustmentDialog({
  open,
  branchId,
  item,
  onClose,
  onSaved,
}: StockAdjustmentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { changeAmount: 0, movementType: "purchase", reason: "" },
  });

  async function onSubmit(values: FormValues) {
    if (!item) return;
    setIsSubmitting(true);
    try {
      await adjustStock({
        branchId,
        inventoryItemId: item.id,
        changeAmount: values.changeAmount,
        movementType: values.movementType as ManualStockMovementType,
        reason: values.reason,
      });
      toast.success("Stock adjusted");
      onSaved();
      reset({ changeAmount: 0, movementType: "purchase", reason: "" });
      onClose();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!item) return null;

  return (
    <Modal open={open} title={`Adjust Stock — ${item.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label={`Change amount (${item.unit}, negative to remove)`}
          type="number"
          step="0.001"
          {...register("changeAmount")}
          error={errors.changeAmount?.message}
        />
        <Select label="Movement type" {...register("movementType")}>
          <option value="purchase">Purchase (adding stock)</option>
          <option value="manual_adjustment">Manual correction</option>
          <option value="waste">Waste / spoilage</option>
        </Select>
        <Input label="Reason" {...register("reason")} error={errors.reason?.message} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Save adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
