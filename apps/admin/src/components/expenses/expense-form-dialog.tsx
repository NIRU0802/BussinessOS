"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { extractApiErrorMessage } from "@/lib/api-client";
import { createExpense, type ExpenseCategory } from "@/lib/api/expenses-api";
import type { Branch } from "@/lib/types";

const schema = z.object({
  branchId: z.string().min(1, "Required"),
  categoryId: z.string().min(1, "Required"),
  amount: z.coerce.number().positive("Must be greater than 0"),
  description: z.string().optional(),
  expenseDate: z.string().min(1, "Required"),
});

type FormValues = z.infer<typeof schema>;

interface ExpenseFormDialogProps {
  open: boolean;
  branches: Branch[];
  categories: ExpenseCategory[];
  defaultBranchId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ExpenseFormDialog({
  open,
  branches,
  categories,
  defaultBranchId,
  onClose,
  onSaved,
}: ExpenseFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset({
        branchId: defaultBranchId ?? branches[0]?.id ?? "",
        categoryId: categories[0]?.id ?? "",
        amount: 0,
        description: "",
        expenseDate: new Date().toISOString().slice(0, 10),
      });
      setReceiptFile(null);
    }
  }, [open, defaultBranchId, branches, categories, reset]);

  function handleReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Receipt must be under 5MB");
      return;
    }
    setReceiptFile(file);
  }

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      await createExpense({
        branchId: values.branchId,
        categoryId: values.categoryId,
        amount: values.amount,
        description: values.description,
        expenseDate: values.expenseDate,
        receipt: receiptFile ?? undefined,
      });
      toast.success("Expense added");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} title="Add Expense" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select label="Branch" {...register("branchId")} error={errors.branchId?.message}>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>

        <Select label="Category" {...register("categoryId")} error={errors.categoryId?.message}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Input
          label="Amount"
          type="number"
          step="0.01"
          {...register("amount")}
          error={errors.amount?.message}
        />

        <Input
          label="Date"
          type="date"
          {...register("expenseDate")}
          error={errors.expenseDate?.message}
        />

        <Textarea
          label="Description"
          placeholder="Optional notes"
          {...register("description")}
          error={errors.description?.message}
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Receipt photo</label>
          <input type="file" accept="image/*,application/pdf" onChange={handleReceiptChange} />
          {receiptFile && <p className="mt-1 text-xs text-slate-500">{receiptFile.name}</p>}
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
