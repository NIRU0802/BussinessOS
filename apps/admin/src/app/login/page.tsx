"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { extractApiErrorMessage } from "@/lib/api-client";
import { tokenStorage } from "@/lib/token-storage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const loginSchema = z.object({
  tenantSlug: z.string().min(1, "Required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      tenantSlug: tokenStorage.getTenantSlug() ?? "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsSubmitting(true);
    try {
      await login(values);
      toast.success("Welcome back");
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Sign in to Business OS</h1>
        <p className="mt-1 text-sm text-slate-500">Enter your workspace slug and credentials.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <Input
            label="Workspace slug"
            placeholder="your-restaurant-abc123"
            {...register("tenantSlug")}
            error={errors.tenantSlug?.message}
          />
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            {...register("email")}
            error={errors.email?.message}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            {...register("password")}
            error={errors.password?.message}
          />
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
