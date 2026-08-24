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
import { createCustomer, updateCustomer, type Customer } from "@/lib/api/customers-api";

const schema = z.object({
  name: z.string().min(1, "Required").max(200),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/, "Enter a valid phone number"),
  email: z.string().email().optional().or(z.literal("")),
  dob: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional(),
});
type FormValues = z.infer<typeof schema>;

interface CustomerFormDialogProps {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSaved: () => void;
}

export function CustomerFormDialog({ open, customer, onClose, onSaved }: CustomerFormDialogProps) {
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
        name: customer?.name ?? "",
        phone: customer?.phone ?? "",
        email: customer?.email ?? "",
        dob: customer?.dob?.slice(0, 10) ?? "",
        notes: customer?.notes ?? "",
      });
    }
  }, [open, customer, reset]);

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const payload = { ...values, email: values.email || undefined, dob: values.dob || undefined };
      if (customer) {
        await updateCustomer(customer.id, payload);
        toast.success("Customer updated");
      } else {
        await createCustomer(payload);
        toast.success("Customer added");
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
    <Modal open={open} title={customer ? "Edit Customer" : "New Customer"} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Name" {...register("name")} error={errors.name?.message} />
        <Input
          label="Phone"
          placeholder="+91XXXXXXXXXX"
          {...register("phone")}
          error={errors.phone?.message}
        />
        <Input label="Email" type="email" {...register("email")} error={errors.email?.message} />
        <Input label="Date of birth" type="date" {...register("dob")} error={errors.dob?.message} />
        <Textarea label="Notes" {...register("notes")} error={errors.notes?.message} />
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
