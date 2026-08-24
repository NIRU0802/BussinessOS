"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/toast-provider";

interface Widget {
  widgetKey: string;
  name: string;
  description: string | null;
  status: "active" | "beta" | "deprecated";
  activeTenantCount: number;
  createdAt: string;
}

const STATUS_CONFIG = {
  active: { color: "var(--success)", label: "Active" },
  beta: { color: "var(--warning)", label: "Beta" },
  deprecated: { color: "var(--danger)", label: "Deprecated" },
};

export default function WidgetsPage() {
  const { showToast } = useToast();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const fetchWidgets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Widget[]>("/super-admin/widgets");
      setWidgets(res);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load widgets.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchWidgets();
  }, [fetchWidgets]);

  async function handleStatusChange(
    widgetKey: string,
    widgetName: string,
    status: "active" | "beta" | "deprecated",
  ) {
    setBusyKey(widgetKey);
    try {
      await api.patch(`/super-admin/widgets/${widgetKey}/status`, { status });
      showToast(`${widgetName} status changed to ${status}.`, "success");
      await fetchWidgets();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update widget.", "error");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleKillSwitch(widgetKey: string, widgetName: string) {
    if (
      !confirm(
        "This is a platform-wide kill switch. It will mark the widget as deprecated for ALL tenants. Continue?",
      )
    )
      return;

    setBusyKey(widgetKey);
    try {
      await api.patch(`/super-admin/widgets/${widgetKey}/status`, {
        isEnabledGlobally: false,
      });
      showToast(`${widgetName} has been disabled platform-wide.`, "success");
      await fetchWidgets();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to disable widget.", "error");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">Widget Marketplace</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Manage widget availability across the platform
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-[var(--muted)]">Loading...</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--panel-border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="px-5 py-3 font-medium">Widget</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Active Tenants</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {widgets.map((w) => {
                const cfg = STATUS_CONFIG[w.status];
                return (
                  <tr
                    key={w.widgetKey}
                    className="border-b border-[var(--panel-border)] last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-3">
                      <div className="font-medium text-[var(--foreground)]">{w.name}</div>
                      <div className="text-xs text-[var(--muted)]">
                        {w.description ?? w.widgetKey}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="rounded px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: `${cfg.color}22`,
                          color: cfg.color,
                        }}
                      >
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[var(--foreground)]">{w.activeTenantCount}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <select
                          value={w.status}
                          disabled={busyKey === w.widgetKey}
                          onChange={(e) =>
                            handleStatusChange(
                              w.widgetKey,
                              w.name,
                              e.target.value as "active" | "beta" | "deprecated",
                            )
                          }
                          className="rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
                        >
                          <option value="active">Active</option>
                          <option value="beta">Beta</option>
                          <option value="deprecated">Deprecated</option>
                        </select>
                        {w.status !== "deprecated" && (
                          <button
                            onClick={() => handleKillSwitch(w.widgetKey, w.name)}
                            disabled={busyKey === w.widgetKey}
                            className="rounded-lg bg-[var(--danger)]/10 px-3 py-1.5 text-xs font-medium text-[var(--danger)] hover:bg-[var(--danger)]/20 disabled:opacity-50"
                          >
                            Kill Switch
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
