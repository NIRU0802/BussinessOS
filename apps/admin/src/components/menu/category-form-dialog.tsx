"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { extractApiErrorMessage } from "@/lib/api-client";
import { createCategory, updateCategory, type MenuCategory } from "@/lib/api/menu-api";

const schema = z.object({
  name: z.string().min(1, "Required").max(150),
  description: z.string().max(500).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});
type FormValues = z.infer<typeof schema>;

interface CategoryFormDialogProps {
  open: boolean;
  category: MenuCategory | null;
  onClose: () => void;
  onSaved: () => void;
}

export function CategoryFormDialog({ open, category, onClose, onSaved }: CategoryFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) {
      reset({
        name: category?.name ?? "",
        description: category?.description ?? "",
        sortOrder: category?.sortOrder ?? 0,
      });
    }
  }, [open, category, reset]);

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      if (category) {
        await updateCategory(category.id, values);
        toast.success("Category updated");
      } else {
        await createCategory(values);
        toast.success("Category created");
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
    <Modal open={open} title={category ? "Edit Category" : "New Category"} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Name" {...register("name")} error={errors.name?.message} />
        <Textarea
          label="Description"
          {...register("description")}
          error={errors.description?.message}
        />
        <Input
          label="Sort order"
          type="number"
          {...register("sortOrder")}
          error={errors.sortOrder?.message}
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
