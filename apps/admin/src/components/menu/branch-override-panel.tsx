"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { extractApiErrorMessage } from "@/lib/api-client";
import {
  setBranchOverride,
  clearBranchOverride,
  type MenuItem,
  type BranchMenuItemOverride,
} from "@/lib/api/menu-api";
import { formatCurrency } from "@/lib/utils";

interface BranchOverridePanelProps {
  branchId: string;
  item: MenuItem;
  override: BranchMenuItemOverride | undefined;
  onSaved: () => void;
}

export function BranchOverridePanel({
  branchId,
  item,
  override,
  onSaved,
}: BranchOverridePanelProps) {
  const [priceOverride, setPriceOverride] = useState<string>(override?.priceOverride ?? "");
  const [isHidden, setIsHidden] = useState(override?.isHidden ?? false);
  const [isAvailable, setIsAvailable] = useState(override?.isAvailable ?? true);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      await setBranchOverride({
        branchId,
        menuItemId: item.id,
        priceOverride: priceOverride === "" ? null : Number(priceOverride),
        isAvailable,
        isHidden,
      });
      toast.success(`Override saved for ${item.name}`);
      onSaved();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleClear() {
    setIsSaving(true);
    try {
      await clearBranchOverride(branchId, item.id);
      toast.success(`Override cleared for ${item.name}`);
      setPriceOverride("");
      setIsHidden(false);
      setIsAvailable(true);
      onSaved();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-3">
      <div>
        <p className="text-sm font-medium text-slate-900">{item.name}</p>
        <p className="text-xs text-slate-500">
          Base price: {formatCurrency(Number(item.basePrice), "INR")}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Input
          type="number"
          step="0.01"
          placeholder="Override price"
          className="w-32"
          value={priceOverride}
          onChange={(e) => setPriceOverride(e.target.value)}
        />
        <label className="flex items-center gap-1 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={isAvailable}
            onChange={(e) => setIsAvailable(e.target.checked)}
          />
          Available
        </label>
        <label className="flex items-center gap-1 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={isHidden}
            onChange={(e) => setIsHidden(e.target.checked)}
          />
          Hidden
        </label>
        <Button size="sm" variant="outline" isLoading={isSaving} onClick={handleSave}>
          Save
        </Button>
        {override && (
          <button
            className="text-xs text-red-600 hover:text-red-800"
            onClick={handleClear}
            disabled={isSaving}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
