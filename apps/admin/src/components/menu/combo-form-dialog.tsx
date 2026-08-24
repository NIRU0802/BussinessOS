"use client";

import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { extractApiErrorMessage } from "@/lib/api-client";
import {
  createCombo,
  updateCombo,
  uploadComboImage,
  listMenuItems,
  type Combo,
} from "@/lib/api/menu-api";
import { formatCurrency } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(1, "Required").max(200),
  description: z.string().max(1000).optional(),
  comboPrice: z.coerce.number().min(0),
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid("Select an item"),
        quantity: z.coerce.number().int().min(1),
      }),
    )
    .min(1, "Add at least one item")
    .max(50),
});
type FormValues = z.infer<typeof schema>;

interface ComboFormDialogProps {
  open: boolean;
  combo: Combo | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ComboFormDialog({ open, combo, onClose, onSaved }: ComboFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [savedCombo, setSavedCombo] = useState<Combo | null>(combo);

  const { data: menuItems = [] } = useQuery({
    queryKey: ["menu-items", ""],
    queryFn: () => listMenuItems(),
    enabled: open,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      comboPrice: 0,
      items: [{ menuItemId: "", quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  useEffect(() => {
    if (open) {
      setSavedCombo(combo);
      reset({
        name: combo?.name ?? "",
        description: combo?.description ?? "",
        comboPrice: combo ? Number(combo.comboPrice) : 0,
        items: combo?.items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })) ?? [
          { menuItemId: "", quantity: 1 },
        ],
      });
    }
  }, [open, combo, reset]);

  const watchedItems = watch("items");
  const suggestedSum = watchedItems.reduce((sum, i) => {
    const item = menuItems.find((m) => m.id === i.menuItemId);
    return sum + (item ? Number(item.basePrice) * (i.quantity || 0) : 0);
  }, 0);

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const result = savedCombo
        ? await updateCombo(savedCombo.id, values)
        : await createCombo(values);
      setSavedCombo(result);
      toast.success(savedCombo ? "Combo updated" : "Combo created — you can now upload an image");
      onSaved();
      if (savedCombo) onClose();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleImageUpload(file: File) {
    if (!savedCombo) {
      toast.error("Save the combo first, then upload an image");
      return;
    }
    setIsUploadingImage(true);
    try {
      const updated = await uploadComboImage(savedCombo.id, file);
      setSavedCombo(updated);
      toast.success("Image uploaded");
      onSaved();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsUploadingImage(false);
    }
  }

  return (
    <Modal
      open={open}
      title={combo ? "Edit Combo" : "New Combo"}
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Name" {...register("name")} error={errors.name?.message} />
        <Textarea
          label="Description"
          {...register("description")}
          error={errors.description?.message}
        />

        <Input
          label="Combo price (set manually)"
          type="number"
          step="0.01"
          {...register("comboPrice")}
          error={errors.comboPrice?.message}
        />
        <p className="text-xs text-slate-400">
          Sum of included items: {formatCurrency(suggestedSum, "INR")} — shown for reference only,
          the price above is never auto-calculated.
        </p>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Included items</span>
            <button
              type="button"
              className="text-sm text-slate-600 hover:text-slate-900"
              onClick={() => append({ menuItemId: "", quantity: 1 })}
            >
              + Add item
            </button>
          </div>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <Select {...register(`items.${index}.menuItemId` as const)} className="flex-1">
                  <option value="">Select item</option>
                  {menuItems.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({formatCurrency(Number(m.basePrice), "INR")})
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min={1}
                  className="w-20"
                  {...register(`items.${index}.quantity` as const)}
                />
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-slate-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {errors.items?.message && (
            <p className="mt-1 text-sm text-red-600">{errors.items.message}</p>
          )}
        </div>

        {savedCombo && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Image</p>
            <ImageUpload
              currentImageUrl={savedCombo.imageUrl}
              onUpload={handleImageUpload}
              isUploading={isUploadingImage}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {savedCombo && !combo ? "Done" : "Cancel"}
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {savedCombo ? "Save changes" : "Create combo"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
