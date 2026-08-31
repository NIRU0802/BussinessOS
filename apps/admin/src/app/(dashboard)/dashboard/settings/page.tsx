"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchBranding,
  updateBranding,
  uploadBrandingLogo,
  type Branding,
} from "@/lib/api/branding-api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/ui/image-upload";
import { extractApiErrorMessage } from "@/lib/api-client";

const COLOR_FIELDS: { key: keyof Branding; label: string }[] = [
  { key: "primaryColor", label: "Primary Color" },
  { key: "primaryColorDark", label: "Primary Color (Dark)" },
  { key: "inkColor", label: "Text / Ink Color" },
  { key: "surfaceColor", label: "Surface Color" },
];

export default function BrandingSettingsPage() {
  const queryClient = useQueryClient();
  const { data: branding, isLoading } = useQuery({
    queryKey: ["branding"],
    queryFn: fetchBranding,
  });

  const [form, setForm] = useState<Partial<Branding>>({});
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    if (branding) setForm(branding);
  }, [branding]);

  const mutation = useMutation({
    mutationFn: updateBranding,
    onSuccess: (data) => {
      queryClient.setQueryData(["branding"], data);
      toast.success("Branding saved");
    },
    onError: (err) => {
      toast.error(extractApiErrorMessage(err));
    },
  });

  const handleChange = (key: keyof Branding, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = async (file: File) => {
    setIsUploadingLogo(true);
    try {
      const { objectKey, url } = await uploadBrandingLogo(file);
      setForm((prev) => ({ ...prev, logoObjectKey: objectKey, logoUrl: url }));
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSave = () => {
    mutation.mutate(form);
  };

  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading branding settings…</div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Branding</h1>
        <p className="mt-1 text-sm text-slate-500">
          Customize how your business appears across the dashboard, mobile app, and customer-facing
          pages.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Business Name"
            value={form.businessName ?? ""}
            onChange={(e) => handleChange("businessName", e.target.value)}
            placeholder="e.g. The Coffee House"
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Logo</label>
            <ImageUpload
              currentImageUrl={form.logoUrl}
              onUpload={handleLogoUpload}
              isUploading={isUploadingLogo}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Colors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {COLOR_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={(form[key] as string) ?? "#000000"}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="h-9 w-9 cursor-pointer rounded border border-slate-200"
                  />
                  <Input
                    value={(form[key] as string) ?? ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder="#000000"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            label="Receipt Footer Text"
            value={form.receiptFooterText ?? ""}
            onChange={(e) => handleChange("receiptFooterText", e.target.value)}
            placeholder="e.g. Thank you for visiting!"
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} isLoading={mutation.isPending}>
          Save Branding
        </Button>
      </div>
    </div>
  );
}
