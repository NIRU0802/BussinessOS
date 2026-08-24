"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/toast-provider";

interface FlagOverride {
  tenantId: string;
  isEnabled: boolean;
}

interface FeatureFlag {
  id: string;
  key: string;
  description: string | null;
  isEnabledGlobally: boolean;
  overrideCount: number;
  overrides: FlagOverride[];
  createdAt: string;
}

export default function FeatureFlagsPage() {
  const { showToast } = useToast();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [overrideTenantId, setOverrideTenantId] = useState("");
  const [overrideEnabled, setOverrideEnabled] = useState(true);
  const [overrideSaving, setOverrideSaving] = useState(false);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<FeatureFlag[]>("/super-admin/feature-flags");
      setFlags(res);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load flags.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post("/super-admin/feature-flags", {
        key: newKey,
        description: newDescription || undefined,
      });
      showToast(`Flag "${newKey}" created.`, "success");
      setNewKey("");
      setNewDescription("");
      setShowForm(false);
      await fetchFlags();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to create flag.", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleGlobal(flag: FeatureFlag) {
    setBusyId(flag.id);
    try {
      await api.patch(`/super-admin/feature-flags/${flag.id}/global`, {
        isEnabled: !flag.isEnabledGlobally,
      });
      showToast(
        `"${flag.key}" is now ${!flag.isEnabledGlobally ? "enabled" : "disabled"} globally.`,
        "success",
      );
      await fetchFlags();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to toggle flag.", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleAddOverride(flagId: string, flagKey: string) {
    if (!overrideTenantId) return;
    setOverrideSaving(true);
    try {
      await api.post(`/super-admin/feature-flags/${flagId}/overrides`, {
        tenantId: overrideTenantId,
        isEnabled: overrideEnabled,
      });
      showToast(`Override added for "${flagKey}".`, "success");
      setOverrideTenantId("");
      await fetchFlags();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to add override.", "error");
    } finally {
      setOverrideSaving(false);
    }
  }

  async function handleRemoveOverride(flagId: string, flagKey: string, tenantId: string) {
    try {
      await api.delete(`/super-admin/feature-flags/${flagId}/overrides/${tenantId}`);
      showToast(`Override removed for "${flagKey}".`, "success");
      await fetchFlags();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to remove override.", "error");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--foreground)]">Feature Flags</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Global flags with per-tenant overrides</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[#0a0e14] hover:opacity-90"
        >
          + New Flag
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Flag Key</label>
              <input
                type="text"
                required
                placeholder="e.g. new_checkout_flow"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                Description
              </label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="mt-3 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[#0a0e14] hover:opacity-90 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Flag"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-sm text-[var(--muted)]">Loading...</div>
      ) : flags.length === 0 ? (
        <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-8 text-center text-sm text-[var(--muted)]">
          No feature flags yet.
        </div>
      ) : (
        <div className="space-y-3">
          {flags.map((flag) => (
            <FlagRow
              key={flag.id}
              flag={flag}
              busy={busyId === flag.id}
              expanded={expandedId === flag.id}
              onToggleExpand={() => setExpandedId(expandedId === flag.id ? null : flag.id)}
              onToggleGlobal={() => handleToggleGlobal(flag)}
              overrideTenantId={overrideTenantId}
              setOverrideTenantId={setOverrideTenantId}
              overrideEnabled={overrideEnabled}
              setOverrideEnabled={setOverrideEnabled}
              overrideSaving={overrideSaving}
              onAddOverride={() => handleAddOverride(flag.id, flag.key)}
              onRemoveOverride={(tenantId) => handleRemoveOverride(flag.id, flag.key, tenantId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
function FlagRow({
  flag,
  busy,
  expanded,
  onToggleExpand,
  onToggleGlobal,
  overrideTenantId,
  setOverrideTenantId,
  overrideEnabled,
  setOverrideEnabled,
  overrideSaving,
  onAddOverride,
  onRemoveOverride,
}: {
  flag: FeatureFlag;
  busy: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleGlobal: () => void;
  overrideTenantId: string;
  setOverrideTenantId: (v: string) => void;
  overrideEnabled: boolean;
  setOverrideEnabled: (v: boolean) => void;
  overrideSaving: boolean;
  onAddOverride: () => void;
  onRemoveOverride: (tenantId: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)]">
      <div className="flex items-center justify-between p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <code className="rounded bg-white/5 px-2 py-0.5 text-xs text-[var(--accent)]">
              {flag.key}
            </code>
            {flag.overrideCount > 0 && (
              <span className="rounded bg-[var(--warning)]/15 px-2 py-0.5 text-xs text-[var(--warning)]">
                {flag.overrideCount} override(s)
              </span>
            )}
          </div>
          {flag.description && (
            <p className="mt-1 text-xs text-[var(--muted)]">{flag.description}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <ToggleSwitch
            checked={flag.isEnabledGlobally}
            disabled={busy}
            onChange={onToggleGlobal}
          />
          <button
            onClick={onToggleExpand}
            className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-white/10"
          >
            {expanded ? "Hide overrides" : "Manage overrides"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[var(--panel-border)] p-5">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Per-Tenant Overrides
          </h4>

          {flag.overrides.length === 0 ? (
            <p className="mb-3 text-xs text-[var(--muted)]">
              No overrides set - this flag applies the global setting to all tenants.
            </p>
          ) : (
            <div className="mb-3 space-y-2">
              {flag.overrides.map((o) => (
                <div
                  key={o.tenantId}
                  className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2 text-xs"
                >
                  <span className="text-[var(--foreground)]">{o.tenantId}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={o.isEnabled ? "text-[var(--success)]" : "text-[var(--danger)]"}
                    >
                      {o.isEnabled ? "Enabled" : "Disabled"}
                    </span>
                    <button
                      onClick={() => onRemoveOverride(o.tenantId)}
                      className="text-[var(--muted)] hover:text-[var(--danger)]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Tenant ID"
              value={overrideTenantId}
              onChange={(e) => setOverrideTenantId(e.target.value)}
              className="flex-1 rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            />
            <select
              value={overrideEnabled ? "enabled" : "disabled"}
              onChange={(e) => setOverrideEnabled(e.target.value === "enabled")}
              className="rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            >
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
            <button
              onClick={onAddOverride}
              disabled={overrideSaving || !overrideTenantId}
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[#0a0e14] hover:opacity-90 disabled:opacity-50"
            >
              {overrideSaving ? "..." : "Add Override"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className="relative h-6 w-11 rounded-full transition disabled:opacity-50"
      style={{
        backgroundColor: checked ? "var(--success)" : "var(--muted)",
      }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
        style={{
          transform: checked ? "translateX(22px)" : "translateX(2px)",
        }}
      />
    </button>
  );
}
