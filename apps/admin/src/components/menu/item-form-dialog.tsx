"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
  createMenuItem,
  updateMenuItem,
  uploadMenuItemImage,
  listModifierGroups,
  type MenuItem,
  type MenuCategory,
} from "@/lib/api/menu-api";
import { listTaxClasses } from "@/lib/api/tax-api";

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const schema = z.object({
  categoryId: z.string().uuid("Select a category"),
  name: z.string().min(1, "Required").max(200),
  description: z.string().max(1000).optional(),
  basePrice: z.coerce.number().min(0),
  isVegetarian: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  taxClassId: z.string().uuid().optional().or(z.literal("")),
  availableDays: z.array(z.string()),
  availableFromTime: z.string().optional().or(z.literal("")),
  availableToTime: z.string().optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

interface ItemFormDialogProps {
  open: boolean;
  item: MenuItem | null;
  categories: MenuCategory[];
  onClose: () => void;
  onSaved: () => void;
}

export function ItemFormDialog({ open, item, categories, onClose, onSaved }: ItemFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [savedItem, setSavedItem] = useState<MenuItem | null>(item);

  const { data: taxClasses = [] } = useQuery({
    queryKey: ["tax-classes"],
    queryFn: listTaxClasses,
    enabled: open,
  });

  const { data: modifierGroups = [] } = useQuery({
    queryKey: ["modifier-groups"],
    queryFn: listModifierGroups,
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      setSavedItem(item);
      reset({
        categoryId: item?.categoryId ?? "",
        name: item?.name ?? "",
        description: item?.description ?? "",
        basePrice: item ? Number(item.basePrice) : 0,
        isVegetarian: item?.isVegetarian ?? false,
        sortOrder: item?.sortOrder ?? 0,
        taxClassId: item?.taxClassId ?? "",
        availableDays: item?.availableDays ?? [],
        availableFromTime: item?.availableFromTime ?? "",
        availableToTime: item?.availableToTime ?? "",
      });
    }
  }, [open, item, reset]);

  const selectedDays = watch("availableDays");

  function toggleDay(day: string) {
    const current = selectedDays ?? [];
    setValue(
      "availableDays",
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
    );
  }

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        taxClassId: values.taxClassId || undefined,
        availableFromTime: values.availableFromTime || undefined,
        availableToTime: values.availableToTime || undefined,
      };
      const result = savedItem
        ? await updateMenuItem(savedItem.id, payload)
        : await createMenuItem(payload);
      setSavedItem(result);
      toast.success(savedItem ? "Item updated" : "Item created â€” you can now upload an image");
      onSaved();
      if (savedItem) onClose();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleImageUpload(file: File) {
    if (!savedItem) {
      toast.error("Save the item first, then upload an image");
      return;
    }
    setIsUploadingImage(true);
    try {
      const updated = await uploadMenuItemImage(savedItem.id, file);
      setSavedItem(updated);
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
      title={item ? "Edit Item" : "New Item"}
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select label="Category" {...register("categoryId")} error={errors.categoryId?.message}>
          <option value="">Select category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Input label="Name" {...register("name")} error={errors.name?.message} />
        <Textarea
          label="Description"
          {...register("description")}
          error={errors.description?.message}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Base price"
            type="number"
            step="0.01"
            {...register("basePrice")}
            error={errors.basePrice?.message}
          />
          <Select label="Tax class" {...register("taxClassId")}>
            <option value="">None</option>
            {taxClasses.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" {...register("isVegetarian")} />
          Vegetarian
        </label>

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">
            Available days (leave empty for every day)
          </p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium capitalize ${
                  selectedDays?.includes(day)
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-600"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Available from (HH:mm)"
            placeholder="09:00"
            {...register("availableFromTime")}
          />
          <Input
            label="Available to (HH:mm)"
            placeholder="22:00"
            {...register("availableToTime")}
          />
        </div>

        {savedItem && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Image</p>
            <ImageUpload
              currentImageUrl={savedItem.imageUrl}
              onUpload={handleImageUpload}
              isUploading={isUploadingImage}
            />
          </div>
        )}

        {modifierGroups.length > 0 && (
          <p className="text-xs text-slate-400">
            Modifier group attachment is managed from the item&apos;s detail view after saving.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {savedItem && !item ? "Done" : "Cancel"}
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {savedItem ? "Save changes" : "Create item"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
