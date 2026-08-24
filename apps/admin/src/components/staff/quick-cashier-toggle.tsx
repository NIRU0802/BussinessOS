"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PermissionGate } from "@/components/shared/permission-gate";
import { extractApiErrorMessage } from "@/lib/api-client";
import { getQuickCashierSetting, setQuickCashierEnabled } from "@/lib/api/quick-cashier-api";

interface QuickCashierToggleProps {
  branchId: string;
}

export function QuickCashierToggle({ branchId }: QuickCashierToggleProps) {
  const [isSaving, setIsSaving] = useState(false);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["quick-cashier-setting", branchId],
    queryFn: () => getQuickCashierSetting(branchId),
    enabled: !!branchId,
  });

  async function handleToggle() {
    setIsSaving(true);
    try {
      await setQuickCashierEnabled(branchId, !data?.enabled);
      toast.success("Quick Cashier setting updated");
      refetch();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PermissionGate permission="settings.manage">
      <Card>
        <CardHeader>
          <CardTitle>Quick Cashier PIN Switch</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Allow cashiers at this branch to switch users via PIN instead of full login on the
              POS.
            </p>
            <button
              onClick={handleToggle}
              disabled={isLoading || isSaving}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                data?.enabled ? "bg-slate-900" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  data?.enabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>
    </PermissionGate>
  );
}
