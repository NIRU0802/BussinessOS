"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { api, ApiError, getAdmin } from "@/lib/api-client";
import { useToast } from "@/components/toast-provider";

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended";
  defaultCurrency: string;
  defaultLanguage: string;
  createdAt: string;
  storageBytes: number;
  branches: {
    id: string;
    name: string;
    isActive: boolean;
    country: string;
    timezone: string;
  }[];
  devices: {
    id: string;
    name: string;
    type: string;
    isActive: boolean;
    lastSeenAt: string | null;
    registeredAt: string;
  }[];
  activeWidgets: { key: string; name: string; activatedAt: string | null }[];
  subscription: {
    planName: string;
    planPrice: string;
    status: string;
    renewalDate: string;
  } | null;
  usage: { ordersThisMonth: number };
  recentAuditTrail: {
    action: string;
    resource_type: string;
    admin_type_at_time: string;
    created_at: string;
    metadata: Record<string, unknown> | null;
  }[];
}

interface BusinessContent {
  recentOrders: {
    id: string;
    channel: string;
    status: string;
    total: string;
    createdAt: string;
    branchId: string;
  }[];
  customers: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    totalOrders: number;
    totalSpent: string;
  }[];
  menuItems: { id: string; name: string; basePrice: string; isActive: boolean }[];
  expenses: {
    id: string;
    amount: string;
    description: string | null;
    expenseDate: string;
  }[];
}

interface BranchOverride {
  id: string;
  branchId: string;
  widgetKey: string;
  isEnabled: boolean;
}

interface TenantWidgetItem {
  widgetKey: string;
  name: string;
  description: string | null;
  platformStatus: "active" | "beta" | "deprecated";
  isActiveForTenant: boolean;
  activatedAt: string | null;
}

export default function TenantDetailPage() {
  const params = useParams();
  const tenantId = params.id as string;
  const { showToast } = useToast();

  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [businessContent, setBusinessContent] = useState<BusinessContent | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "business">("overview");
  const [loading, setLoading] = useState(true);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expandedBranchId, setExpandedBranchId] = useState<string | null>(null);
  const [branchOverrides, setBranchOverrides] = useState<BranchOverride[]>([]);
  const [overridesLoading, setOverridesLoading] = useState(false);

  const [tenantWidgets, setTenantWidgets] = useState<TenantWidgetItem[]>([]);
  const [tenantWidgetsLoading, setTenantWidgetsLoading] = useState(true);

  const isGr8 = getAdmin()?.adminType === "GR8";

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<TenantDetail>(`/super-admin/tenants/${tenantId}`);
      setDetail(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load tenant.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const refreshDetailSilently = useCallback(async () => {
    try {
      const res = await api.get<TenantDetail>(`/super-admin/tenants/${tenantId}`);
      setDetail(res);
    } catch {
      // silent - a background refresh failing shouldn't disrupt the UI
    }
  }, [tenantId]);

  const fetchTenantWidgets = useCallback(async () => {
    setTenantWidgetsLoading(true);
    try {
      const res = await api.get<TenantWidgetItem[]>(`/super-admin/widgets/tenant/${tenantId}`);
      setTenantWidgets(res);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load tenant widgets.", "error");
    } finally {
      setTenantWidgetsLoading(false);
    }
  }, [tenantId, showToast]);

  useEffect(() => {
    fetchDetail();
    fetchTenantWidgets();
  }, [fetchDetail, fetchTenantWidgets]);

  async function handleToggleTenantWidget(widgetKey: string, widgetName: string, enable: boolean) {
    try {
      await api.post(`/super-admin/widgets/tenant/${tenantId}`, {
        widgetKey,
        isEnabled: enable,
      });
      showToast(`${widgetName} ${enable ? "enabled" : "disabled"} for this business.`, "success");
      await fetchTenantWidgets();
      await refreshDetailSilently();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update widget.", "error");
    }
  }

  async function handleViewBusinessContent() {
    setActiveTab("business");
    if (businessContent) return;

    setBusinessLoading(true);
    try {
      const res = await api.get<BusinessContent>(
        `/super-admin/tenants/${tenantId}/business-content`,
      );
      setBusinessContent(res);
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Failed to load business content.",
        "error",
      );
    } finally {
      setBusinessLoading(false);
    }
  }

  async function handleToggleBranchWidgets(branchId: string) {
    if (expandedBranchId === branchId) {
      setExpandedBranchId(null);
      return;
    }
    setExpandedBranchId(branchId);
    setOverridesLoading(true);
    try {
      const res = await api.get<BranchOverride[]>(
        `/super-admin/widgets/branch-overrides/${branchId}`,
      );
      setBranchOverrides(res);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load branch widgets.", "error");
    } finally {
      setOverridesLoading(false);
    }
  }

  async function handleSetBranchWidget(
    branchId: string,
    widgetKey: string,
    widgetName: string,
    isEnabled: boolean,
  ) {
    try {
      await api.post(`/super-admin/widgets/branch-overrides/${branchId}`, {
        widgetKey,
        isEnabled,
      });
      showToast(`${widgetName} ${isEnabled ? "enabled" : "disabled"} for this branch.`, "success");
      const res = await api.get<BranchOverride[]>(
        `/super-admin/widgets/branch-overrides/${branchId}`,
      );
      setBranchOverrides(res);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update branch widget.", "error");
    }
  }

  async function handleRemoveBranchOverride(
    branchId: string,
    widgetKey: string,
    widgetName: string,
  ) {
    try {
      await api.delete(`/super-admin/widgets/branch-overrides/${branchId}/${widgetKey}`);
      showToast(`${widgetName} override removed - back to tenant default.`, "success");
      const res = await api.get<BranchOverride[]>(
        `/super-admin/widgets/branch-overrides/${branchId}`,
      );
      setBranchOverrides(res);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to remove override.", "error");
    }
  }

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">Loading...</div>;
  }

  if (error || !detail) {
    return (
      <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
        {error ?? "Tenant not found."}
      </div>
    );
  }

  return (
    <div>
      <TenantHeader detail={detail} />

      <div className="mb-6 flex gap-2 border-b border-[var(--panel-border)]">
        <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")}>
          Overview
        </TabButton>
        {isGr8 && (
          <TabButton active={activeTab === "business"} onClick={handleViewBusinessContent}>
            Business Content (GR8 only)
          </TabButton>
        )}
      </div>

      {activeTab === "overview" && (
        <OverviewTab
          detail={detail}
          expandedBranchId={expandedBranchId}
          branchOverrides={branchOverrides}
          overridesLoading={overridesLoading}
          onToggleBranchWidgets={handleToggleBranchWidgets}
          onSetBranchWidget={handleSetBranchWidget}
          onRemoveBranchOverride={handleRemoveBranchOverride}
          activeWidgetKeys={detail.activeWidgets.map((w) => w.key)}
          tenantWidgets={tenantWidgets}
          tenantWidgetsLoading={tenantWidgetsLoading}
          onToggleTenantWidget={handleToggleTenantWidget}
        />
      )}
      {activeTab === "business" && (
        <BusinessContentTab loading={businessLoading} content={businessContent} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-1 pb-3 text-sm font-medium transition ${
        active
          ? "border-[var(--accent)] text-[var(--accent)]"
          : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
      }`}
    >
      {children}
    </button>
  );
}

function TenantHeader({ detail }: { detail: TenantDetail }) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <h1 className="text-lg font-semibold text-[var(--foreground)]">{detail.name}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{detail.slug}</p>
      </div>
      <span
        className={`rounded px-2.5 py-1 text-xs font-medium ${
          detail.status === "active"
            ? "bg-[var(--success)]/15 text-[var(--success)]"
            : "bg-[var(--danger)]/15 text-[var(--danger)]"
        }`}
      >
        {detail.status}
      </span>
    </div>
  );
}
function OverviewTab({
  detail,
  expandedBranchId,
  branchOverrides,
  overridesLoading,
  onToggleBranchWidgets,
  onSetBranchWidget,
  onRemoveBranchOverride,
  activeWidgetKeys,
  tenantWidgets,
  tenantWidgetsLoading,
  onToggleTenantWidget,
}: {
  detail: TenantDetail;
  expandedBranchId: string | null;
  branchOverrides: BranchOverride[];
  overridesLoading: boolean;
  onToggleBranchWidgets: (branchId: string) => void;
  onSetBranchWidget: (
    branchId: string,
    widgetKey: string,
    widgetName: string,
    isEnabled: boolean,
  ) => void;
  onRemoveBranchOverride: (branchId: string, widgetKey: string, widgetName: string) => void;
  activeWidgetKeys: string[];
  tenantWidgets: TenantWidgetItem[];
  tenantWidgetsLoading: boolean;
  onToggleTenantWidget: (widgetKey: string, widgetName: string, enable: boolean) => void;
}) {
  const [showAllAudit, setShowAllAudit] = useState(false);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Branches" value={detail.branches.length} />
        <StatCard label="Orders This Month" value={detail.usage.ordersThisMonth} />
        <StatCard label="Subscription" value={detail.subscription?.status ?? "No plan"} />
        <StatCard label="Storage Used" value={formatBytes(detail.storageBytes)} />
      </div>

      <Section title="Branches">
        {detail.branches.length === 0 ? (
          <EmptyRow text="No branches" />
        ) : (
          <div className="divide-y divide-[var(--panel-border)]">
            {detail.branches.map((b) => (
              <div key={b.id} className="py-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-[var(--foreground)]">{b.name}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {b.country} - {b.timezone}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusDot active={b.isActive} />
                    <button
                      onClick={() => onToggleBranchWidgets(b.id)}
                      className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-white/10"
                    >
                      {expandedBranchId === b.id ? "Hide widgets" : "Manage widgets"}
                    </button>
                  </div>
                </div>

                {expandedBranchId === b.id && (
                  <BranchWidgetPanel
                    branchId={b.id}
                    overrides={branchOverrides}
                    loading={overridesLoading}
                    activeWidgetKeys={activeWidgetKeys}
                    onSetWidget={onSetBranchWidget}
                    onRemoveOverride={onRemoveBranchOverride}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Devices">
        {detail.devices.length === 0 ? (
          <EmptyRow text="No devices registered" />
        ) : (
          <div className="divide-y divide-[var(--panel-border)]">
            {detail.devices.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-sm text-[var(--foreground)]">{d.name}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {d.type} - Last seen:{" "}
                    {d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : "Never"}
                  </div>
                </div>
                <StatusDot active={d.isActive} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Manage Widgets (Tenant-wide)">
        {tenantWidgetsLoading ? (
          <p className="py-4 text-sm text-[var(--muted)]">Loading widgets...</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {tenantWidgets.map((w) => (
              <div
                key={w.widgetKey}
                className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-sm text-[var(--foreground)]">{w.name}</div>
                  {w.platformStatus !== "active" && (
                    <span className="text-[10px] uppercase text-[var(--warning)]">
                      {w.platformStatus} platform-wide
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onToggleTenantWidget(w.widgetKey, w.name, !w.isActiveForTenant)}
                  disabled={w.platformStatus === "deprecated"}
                  className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-40"
                  style={{
                    backgroundColor: w.isActiveForTenant ? "var(--success)" : "var(--danger)",
                  }}
                >
                  <span
                    className="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-out"
                    style={{
                      transform: w.isActiveForTenant ? "translateX(22px)" : "translateX(2px)",
                    }}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Recent Audit Trail">
        {detail.recentAuditTrail.length === 0 ? (
          <EmptyRow text="No recorded actions" />
        ) : (
          <>
            <div className="divide-y divide-[var(--panel-border)]">
              {(showAllAudit ? detail.recentAuditTrail : detail.recentAuditTrail.slice(0, 5)).map(
                (entry, i) => (
                  <div key={i} className="py-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-white/5 px-2 py-0.5 text-xs text-[var(--accent)]">
                          {entry.action}
                        </code>
                        <span className="text-xs text-[var(--foreground)]">
                          {summarizeAuditMetadata(entry.action, entry.metadata)}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs text-[var(--muted)]">
                        {entry.admin_type_at_time} - {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ),
              )}
            </div>
            {detail.recentAuditTrail.length > 5 && (
              <button
                onClick={() => setShowAllAudit((v) => !v)}
                className="mt-3 text-xs font-medium text-[var(--accent)] hover:underline"
              >
                {showAllAudit ? "Show less" : `Show all ${detail.recentAuditTrail.length} entries`}
              </button>
            )}
          </>
        )}
      </Section>
    </div>
  );
}

function BranchWidgetPanel({
  branchId,
  overrides,
  loading,
  activeWidgetKeys,
  onSetWidget,
  onRemoveOverride,
}: {
  branchId: string;
  overrides: BranchOverride[];
  loading: boolean;
  activeWidgetKeys: string[];
  onSetWidget: (
    branchId: string,
    widgetKey: string,
    widgetName: string,
    isEnabled: boolean,
  ) => void;
  onRemoveOverride: (branchId: string, widgetKey: string, widgetName: string) => void;
}) {
  if (loading) {
    return (
      <div className="mt-3 rounded-lg bg-white/[0.02] p-4 text-xs text-[var(--muted)]">
        Loading widgets...
      </div>
    );
  }

  const overrideMap = new Map(overrides.map((o) => [o.widgetKey, o.isEnabled]));

  return (
    <div className="mt-3 rounded-lg border border-[var(--panel-border)] bg-white/[0.02] p-4">
      <p className="mb-3 text-xs text-[var(--muted)]">
        By default this branch inherits the tenant-wide widget list above. Use the toggles below to
        override a widget for just this branch.
      </p>
      <div className="space-y-2">
        {activeWidgetKeys.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">
            This tenant has no active widgets to override.
          </p>
        ) : (
          activeWidgetKeys.map((widgetKey) => {
            const hasOverride = overrideMap.has(widgetKey);
            const isEnabled = hasOverride ? (overrideMap.get(widgetKey) as boolean) : true;

            return (
              <div
                key={widgetKey}
                className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <code className="text-[var(--accent)]">{widgetKey}</code>
                  {hasOverride && (
                    <span className="rounded bg-[var(--warning)]/15 px-1.5 py-0.5 text-[10px] text-[var(--warning)]">
                      Override
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSetWidget(branchId, widgetKey, widgetKey, !isEnabled)}
                    className={`rounded px-2 py-1 text-[10px] font-medium ${
                      isEnabled
                        ? "bg-[var(--success)]/15 text-[var(--success)]"
                        : "bg-[var(--danger)]/15 text-[var(--danger)]"
                    }`}
                  >
                    {isEnabled ? "Enabled" : "Disabled"}
                  </button>
                  {hasOverride && (
                    <button
                      onClick={() => onRemoveOverride(branchId, widgetKey, widgetKey)}
                      className="text-[var(--muted)] hover:text-[var(--danger)]"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function BusinessContentTab({
  loading,
  content,
}: {
  loading: boolean;
  content: BusinessContent | null;
}) {
  if (loading) {
    return <div className="text-sm text-[var(--muted)]">Loading business content...</div>;
  }

  if (!content) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-4 py-3 text-sm text-[var(--warning)]">
        This tab shows the tenant real business data (orders, customer PII, menu, financials). This
        access is logged in the audit trail.
      </div>

      <Section title={`Recent Orders (${content.recentOrders.length})`}>
        <div className="divide-y divide-[var(--panel-border)]">
          {content.recentOrders.map((o) => (
            <div key={o.id} className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-[var(--foreground)]">
                {o.channel} - {o.status}
              </span>
              <span className="text-[var(--muted)]">
                {o.total} - {new Date(o.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title={`Customers (${content.customers.length})`}>
        <div className="divide-y divide-[var(--panel-border)]">
          {content.customers.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2.5 text-sm">
              <div>
                <div className="text-[var(--foreground)]">{c.name}</div>
                <div className="text-xs text-[var(--muted)]">{c.phone}</div>
              </div>
              <span className="text-[var(--muted)]">
                {c.totalOrders} orders - {c.totalSpent}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title={`Menu Items (${content.menuItems.length})`}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {content.menuItems.map((m) => (
            <div
              key={m.id}
              className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
            >
              <div className="text-[var(--foreground)]">{m.name}</div>
              <div className="text-xs text-[var(--muted)]">{m.basePrice}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title={`Expenses (${content.expenses.length})`}>
        <div className="divide-y divide-[var(--panel-border)]">
          {content.expenses.map((e) => (
            <div key={e.id} className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-[var(--foreground)]">{e.description ?? "No description"}</span>
              <span className="text-[var(--muted)]">
                {e.amount} - {new Date(e.expenseDate).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-xl font-semibold text-[var(--foreground)]">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      {children}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="py-4 text-sm text-[var(--muted)]">{text}</p>;
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className="h-2 w-2 rounded-full"
      style={{
        backgroundColor: active ? "var(--success)" : "var(--muted)",
      }}
    />
  );
}
function summarizeAuditMetadata(action: string, metadata: Record<string, unknown> | null): string {
  if (!metadata) return "";

  if (action === "tenant_widget.set") {
    const widgetName = (metadata.widgetName as string) ?? (metadata.widgetKey as string);
    const isEnabled = metadata.isEnabled as boolean;
    return `${widgetName} ${isEnabled ? "enabled" : "disabled"}`;
  }

  if (action === "branch_widget.set_override") {
    const widgetName = (metadata.widgetName as string) ?? (metadata.widgetKey as string);
    const isEnabled = metadata.isEnabled as boolean;
    return `${widgetName} ${isEnabled ? "enabled" : "disabled"} for branch`;
  }

  if (action === "branch_widget.remove_override") {
    return `${(metadata.widgetKey as string) ?? ""} override removed`;
  }

  if (action === "tenant.suspend") {
    return (metadata.reason as string) ?? "";
  }

  if (action === "plan.assign_to_tenant") {
    return `Plan: ${(metadata.planName as string) ?? ""}`;
  }

  return "";
}
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(1)} ${units[i]}`;
}
