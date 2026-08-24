"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";

interface DependencyHealth {
  up: boolean;
  latencyMs: number;
  error?: string;
}

interface SystemHealthReport {
  database: DependencyHealth;
  redis: DependencyHealth;
  minio: DependencyHealth;
  overallStatus: "healthy" | "degraded" | "down";
  checkedAt: string;
}

interface StorageStats {
  totalBytes: number;
  checkedAt: string;
}

interface DashboardSummary {
  platformTotals: {
    totalTenants: number;
    activeTenants: number;
    suspendedTenants: number;
    totalBranches: number;
  };
  revenue: {
    monthlyRecurringRevenue: number;
    totalActiveSubscriptions: number;
  };
  recentActivity: {
    action: string;
    adminName: string;
    adminType: "GR8" | "TEAM";
    targetTenantId: string | null;
    createdAt: string;
  }[];
  topStorageTenants: { id: string; name: string; bytes: number }[];
  subscriptionBreakdown: {
    byPlan: { planName: string; count: number }[];
    noPlan: number;
  };
  widgetAdoption: {
    widgetKey: string;
    name: string;
    activeTenantCount: number;
  }[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(1)} ${units[i]}`;
}

const POLL_INTERVAL_MS = 10000;

export default function OverviewPage() {
  const [health, setHealth] = useState<SystemHealthReport | null>(null);
  const [storage, setStorage] = useState<StorageStats | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await api.get<SystemHealthReport>("/super-admin/monitoring/health");
      setHealth(data);
      setError(null);
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    } catch {
      setError("Could not reach the monitoring endpoint.");
    }
  }, []);

  const fetchStorage = useCallback(async () => {
    try {
      const data = await api.get<StorageStats>("/super-admin/monitoring/storage");
      setStorage(data);
    } catch {
      // non-critical
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await api.get<DashboardSummary>("/super-admin/monitoring/dashboard-summary");
      setSummary(data);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    fetchStorage();
    fetchSummary();
    const interval = setInterval(() => {
      fetchHealth();
      fetchStorage();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchHealth, fetchStorage, fetchSummary]);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--foreground)]">System Overview</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Live platform health, refreshes every 10 seconds
          </p>
        </div>
        {health && <OverallBadge status={health.overallStatus} pulse={pulse} />}
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MonitorCard label="Database" icon="db" health={health?.database} />
        <MonitorCard label="Redis" icon="rd" health={health?.redis} />
        <MonitorCard label="MinIO Storage" icon="mn" health={health?.minio} />
      </div>

      {health && (
        <p className="mt-6 text-xs text-[var(--muted)]">
          Last checked: {new Date(health.checkedAt).toLocaleTimeString()}
        </p>
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Platform Storage</h2>
        <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
          {storage ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-semibold text-[var(--foreground)]">
                  {formatBytes(storage.totalBytes)}
                </div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  Total used across all tenants (MinIO)
                </div>
              </div>
              <span className="text-3xl">{"\u{1F4E6}"}</span>
            </div>
          ) : (
            <div className="text-sm text-[var(--muted)]">Loading storage stats...</div>
          )}
        </div>
      </div>

      {summary && (
        <div className="mt-8 space-y-8">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Platform Totals</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <MiniStat label="Total Tenants" value={summary.platformTotals.totalTenants} />
              <MiniStat
                label="Active"
                value={summary.platformTotals.activeTenants}
                color="var(--success)"
              />
              <MiniStat
                label="Suspended"
                value={summary.platformTotals.suspendedTenants}
                color="var(--danger)"
              />
              <MiniStat label="Total Branches" value={summary.platformTotals.totalBranches} />
              <MiniStat
                label="MRR"
                value={`\u20B9${summary.revenue.monthlyRecurringRevenue.toFixed(0)}`}
                color="var(--accent)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RecentActivityPanel activity={summary.recentActivity} />
            <TopStoragePanel tenants={summary.topStorageTenants} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SubscriptionBreakdownPanel breakdown={summary.subscriptionBreakdown} />
            <WidgetAdoptionPanel widgets={summary.widgetAdoption} />
          </div>
        </div>
      )}
    </div>
  );
}
function OverallBadge({
  status,
  pulse,
}: {
  status: "healthy" | "degraded" | "down";
  pulse: boolean;
}) {
  const config = {
    healthy: { color: "var(--success)", label: "All Systems Operational" },
    degraded: { color: "var(--warning)", label: "Degraded Performance" },
    down: { color: "var(--danger)", label: "System Down" },
  }[status];

  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-2">
      <span className="relative flex h-2.5 w-2.5">
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
            pulse ? "animate-ping" : ""
          }`}
          style={{ backgroundColor: config.color }}
        />
        <span
          className="relative inline-flex h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: config.color }}
        />
      </span>
      <span className="text-sm font-medium text-[var(--foreground)]">{config.label}</span>
    </div>
  );
}

function MonitorCard({
  label,
  icon,
  health,
}: {
  label: string;
  icon: string;
  health?: DependencyHealth;
}) {
  const isUp = health?.up ?? null;
  const color = isUp === null ? "var(--muted)" : isUp ? "var(--success)" : "var(--danger)";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--muted)]">
            {icon}
          </span>
          <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
        </div>
        <span className="relative flex h-2 w-2">
          {isUp && (
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ backgroundColor: color }}
            />
          )}
          <span
            className="relative inline-flex h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
          />
        </span>
      </div>

      <div className="relative mb-4 h-10 overflow-hidden rounded-lg bg-black/20">
        <HeartbeatLine active={isUp === true} color={color} />
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
          {isUp === null ? "Checking..." : isUp ? "Operational" : "Down"}
        </span>
        {health && <span className="text-xs text-[var(--muted)]">{health.latencyMs}ms</span>}
      </div>

      {health?.error && (
        <p className="mt-2 truncate text-xs text-[var(--danger)]" title={health.error}>
          {health.error}
        </p>
      )}
    </div>
  );
}

function HeartbeatLine({ active, color }: { active: boolean; color: string }) {
  return (
    <svg viewBox="0 0 300 40" className="h-full w-full" preserveAspectRatio="none">
      <polyline
        points="0,20 40,20 55,5 70,35 85,20 130,20 145,10 160,30 175,20 300,20"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        className={active ? "animate-heartbeat" : ""}
        style={{ opacity: active ? 1 : 0.3 }}
      />
    </svg>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-xl font-semibold" style={{ color: color ?? "var(--foreground)" }}>
        {value}
      </div>
    </div>
  );
}

function RecentActivityPanel({ activity }: { activity: DashboardSummary["recentActivity"] }) {
  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Recent Activity</h3>
      {activity.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No recent activity.</p>
      ) : (
        <div className="divide-y divide-[var(--panel-border)]">
          {activity.map((entry, i) => (
            <div key={i} className="flex items-center justify-between py-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <code className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-xs text-[var(--accent)]">
                  {entry.action}
                </code>
                <span className="truncate text-xs text-[var(--muted)]">{entry.adminName}</span>
              </div>
              <span className="shrink-0 text-xs text-[var(--muted)]">
                {new Date(entry.createdAt).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
      <Link
        href="/dashboard/monitoring"
        className="mt-3 inline-block text-xs font-medium text-[var(--accent)] hover:underline"
      >
        View full audit log
      </Link>
    </div>
  );
}

function TopStoragePanel({ tenants }: { tenants: DashboardSummary["topStorageTenants"] }) {
  const maxBytes = Math.max(...tenants.map((t) => t.bytes), 1);

  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Top Storage Consumers</h3>
      {tenants.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No storage usage yet.</p>
      ) : (
        <div className="space-y-3">
          {tenants.map((t) => (
            <Link key={t.id} href={`/dashboard/tenants/${t.id}`} className="block">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="truncate text-[var(--foreground)] hover:text-[var(--accent)]">
                  {t.name}
                </span>
                <span className="shrink-0 text-[var(--muted)]">{formatBytes(t.bytes)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${(t.bytes / maxBytes) * 100}%` }}
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function SubscriptionBreakdownPanel({
  breakdown,
}: {
  breakdown: DashboardSummary["subscriptionBreakdown"];
}) {
  const total = breakdown.byPlan.reduce((sum, p) => sum + p.count, 0) + breakdown.noPlan;

  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
        Subscription Breakdown
      </h3>
      <div className="space-y-2">
        {breakdown.byPlan.map((p) => (
          <div key={p.planName} className="flex items-center justify-between text-sm">
            <span className="text-[var(--foreground)]">{p.planName}</span>
            <span className="text-[var(--muted)]">
              {p.count} tenant{p.count === 1 ? "" : "s"}
            </span>
          </div>
        ))}
        {breakdown.noPlan > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--warning)]">No plan assigned</span>
            <span className="text-[var(--muted)]">
              {breakdown.noPlan} tenant{breakdown.noPlan === 1 ? "" : "s"}
            </span>
          </div>
        )}
        {total === 0 && <p className="text-sm text-[var(--muted)]">No tenants yet.</p>}
      </div>
    </div>
  );
}

function WidgetAdoptionPanel({ widgets }: { widgets: DashboardSummary["widgetAdoption"] }) {
  const maxCount = Math.max(...widgets.map((w) => w.activeTenantCount), 1);

  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Widget Adoption</h3>
      {widgets.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No widgets active yet.</p>
      ) : (
        <div className="space-y-2">
          {widgets.slice(0, 6).map((w) => (
            <div key={w.widgetKey}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-[var(--foreground)]">{w.name}</span>
                <span className="text-[var(--muted)]">{w.activeTenantCount} tenants</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-[var(--success)]"
                  style={{ width: `${(w.activeTenantCount / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
