"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { extractApiErrorMessage } from "@/lib/api-client";
import { getTableQrToken, rotateTableQrToken } from "@/lib/api/branches-api";
import type { RestaurantTable } from "@/lib/api/branches-api";

interface QrCodePanelProps {
  table: RestaurantTable | null;
  onClose: () => void;
}

export function QrCodePanel({ table, onClose }: QrCodePanelProps) {
  const [isRotating, setIsRotating] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["table-qr", table?.id],
    queryFn: () => getTableQrToken(table!.id),
    enabled: !!table,
  });

  async function handleRotate() {
    if (!table) return;
    setIsRotating(true);
    try {
      await rotateTableQrToken(table.id);
      toast.success("QR code rotated — old code is now invalid");
      refetch();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsRotating(false);
    }
  }

  if (!table) return null;

  // The QR image itself is generated client-side from the signed token URL
  // via Google Chart API as a lightweight no-dependency approach — swap for
  // a proper QR library (e.g. `qrcode`) if offline rendering is needed.
  const qrImageSrc = data?.qrUrl
    ? `https://chart.googleapis.com/chart?cht=qr&chs=240x240&chl=${encodeURIComponent(data.qrUrl)}`
    : null;

  return (
    <Modal open={!!table} title={`QR Code — ${table.label}`} onClose={onClose}>
      <div className="flex flex-col items-center gap-4">
        {qrImageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrImageSrc} alt={`QR code for ${table.label}`} className="h-60 w-60" />
        ) : (
          <div className="flex h-60 w-60 items-center justify-center rounded-md bg-slate-100 text-sm text-slate-400">
            Loading QR…
          </div>
        )}
        <p className="break-all text-center text-xs text-slate-500">{data?.qrUrl ?? data?.token}</p>
        <Button variant="outline" isLoading={isRotating} onClick={handleRotate}>
          Rotate QR Code
        </Button>
        <p className="text-center text-xs text-amber-600">
          Rotating invalidates the current code — any printed QR codes for this table will stop
          working immediately.
        </p>
      </div>
    </Modal>
  );
}
