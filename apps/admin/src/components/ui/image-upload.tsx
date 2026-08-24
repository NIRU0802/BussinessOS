"use client";

import { useRef, useState } from "react";
import { Button } from "./button";

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onUpload: (file: File) => Promise<void>;
  isUploading?: boolean;
}

export function ImageUpload({ currentImageUrl, onUpload, isUploading }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Only image files are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    onUpload(file);
  }

  const displayUrl = previewUrl ?? currentImageUrl;

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="Preview" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-slate-400">No image</span>
        )}
      </div>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          isLoading={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {displayUrl ? "Change image" : "Upload image"}
        </Button>
        <p className="mt-1 text-xs text-slate-400">PNG/JPG, up to 5MB</p>
      </div>
    </div>
  );
}
