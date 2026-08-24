"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { extractApiErrorMessage } from "@/lib/api-client";
import { createModifierGroup } from "@/lib/api/menu-api";

const schema = z.object({
  name: z.string().min(1, "Required").max(150),
  minSelect: z.coerce.number().int().min(0),
  maxSelect: z.coerce.number().int().min(1).max(50),
  isRequired: z.boolean(),
  options: z
    .array(
      z.object({
        name: z.string().min(1, "Required").max(100),
        priceDelta: z.coerce.number(),
      }),
    )
    .min(1, "Add at least one option")
    .max(50),
});
type FormValues = z.infer<typeof schema>;

interface ModifierGroupFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function ModifierGroupFormDialog({ open, onClose, onSaved }: ModifierGroupFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      minSelect: 0,
      maxSelect: 1,
      isRequired: false,
      options: [{ name: "", priceDelta: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "options" });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      await createModifierGroup(values);
      toast.success("Modifier group created");
      onSaved();
      reset({
        name: "",
        minSelect: 0,
        maxSelect: 1,
        isRequired: false,
        options: [{ name: "", priceDelta: 0 }],
      });
      onClose();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} title="New Modifier Group" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Name" {...register("name")} error={errors.name?.message} />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Min select"
            type="number"
            {...register("minSelect")}
            error={errors.minSelect?.message}
          />
          <Input
            label="Max select"
            type="number"
            {...register("maxSelect")}
            error={errors.maxSelect?.message}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" {...register("isRequired")} />
          Required (customer must choose)
        </label>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Options</span>
            <button
              type="button"
              className="text-sm text-slate-600 hover:text-slate-900"
              onClick={() => append({ name: "", priceDelta: 0 })}
            >
              + Add option
            </button>
          </div>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <Input
                  placeholder="Option name"
                  {...register(`options.${index}.name` as const)}
                  error={errors.options?.[index]?.name?.message}
                />
                <Input
                  placeholder="Price +/-"
                  type="number"
                  step="0.01"
                  className="w-28"
                  {...register(`options.${index}.priceDelta` as const)}
                />
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-slate-400 hover:text-red-600"
                  >
                    âœ•
                  </button>
                )}
              </div>
            ))}
          </div>
          {errors.options?.message && (
            <p className="mt-1 text-sm text-red-600">{errors.options.message}</p>
          )}
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
