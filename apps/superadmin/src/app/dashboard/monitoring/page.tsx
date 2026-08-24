"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/toast-provider";

interface AuditLogEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  targetTenantId: string | null;
  adminEmail: string;
  adminName: string;
  adminType: "GR8" | "TEAM";
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditLogResponse {
  data: AuditLogEntry[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export default function MonitoringAuditLogsPage() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [meta, setMeta] = useState<AuditLogResponse["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [tenantFilter, setTenantFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tenantFilter) params.set("tenantId", tenantFilter);
      if (actionFilter) params.set("action", actionFilter);
      params.set("page", String(page));
      params.set("pageSize", "15");

      const res = await api.get<AuditLogResponse>(
        `/super-admin/monitoring/audit-logs?${params.toString()}`,
      );
      setLogs(res.data);
      setMeta(res.meta);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load audit logs.", "error");
    } finally {
      setLoading(false);
    }
  }, [tenantFilter, actionFilter, page, showToast]);

  useEffect(() => {
    const timeout = setTimeout(fetchLogs, 300);
    return () => clearTimeout(timeout);
  }, [fetchLogs]);

  useEffect(() => {
    setPage(1);
  }, [tenantFilter, actionFilter]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">Audit Log</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Cross-tenant record of every Super Admin action
        </p>
      </div>

      <div className="mb-4 flex gap-3">
        <input
          type="text"
          placeholder="Filter by tenant ID..."
          value={tenantFilter}
          onChange={(e) => setTenantFilter(e.target.value)}
          className="w-64 rounded-lg border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
        />
        <input
          type="text"
          placeholder="Filter by action (e.g. tenant.suspend)..."
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="w-72 rounded-lg border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--panel-border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="px-5 py-3 font-medium">Action</th>
              <th className="px-5 py-3 font-medium">Admin</th>
              <th className="px-5 py-3 font-medium">Tenant</th>
              <th className="px-5 py-3 font-medium">Time</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-[var(--muted)]">
                  Loading...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-[var(--muted)]">
                  No audit log entries found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <AuditRow
                  key={log.id}
                  log={log}
                  expanded={expandedId === log.id}
                  onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-[var(--muted)]">
          <span>
            Showing {(meta.page - 1) * meta.pageSize + 1}-
            {Math.min(meta.page * meta.pageSize, meta.total)} of {meta.total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-white/10 disabled:opacity-50"
            >
              Previous
            </button>
            {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`h-7 w-7 rounded-lg text-xs font-medium ${
                  p === page
                    ? "bg-[var(--accent)] text-[#0a0e14]"
                    : "bg-white/5 text-[var(--foreground)] hover:bg-white/10"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-white/10 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
function AuditRow({
  log,
  expanded,
  onToggle,
}: {
  log: AuditLogEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

  return (
    <>
      <tr className="border-b border-[var(--panel-border)] last:border-0 hover:bg-white/[0.02]">
        <td className="px-5 py-3">
          <code className="rounded bg-white/5 px-2 py-0.5 text-xs text-[var(--accent)]">
            {log.action}
          </code>
        </td>
        <td className="px-5 py-3">
          <div className="text-[var(--foreground)]">{log.adminName}</div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <span
              className={`rounded px-1 py-0.5 text-[10px] font-semibold ${
                log.adminType === "GR8"
                  ? "bg-[var(--danger)]/15 text-[var(--danger)]"
                  : "bg-[var(--accent)]/15 text-[var(--accent)]"
              }`}
            >
              {log.adminType}
            </span>
            {log.adminEmail}
          </div>
        </td>
        <td className="px-5 py-3 text-xs text-[var(--muted)]">
          {log.targetTenantId ? (
            <code className="rounded bg-white/5 px-1.5 py-0.5">
              {log.targetTenantId.slice(0, 8)}...
            </code>
          ) : (
            <span>Platform-wide</span>
          )}
        </td>
        <td className="px-5 py-3 text-xs text-[var(--muted)]">
          {new Date(log.createdAt).toLocaleString()}
        </td>
        <td className="px-5 py-3 text-right">
          {hasMetadata && (
            <button onClick={onToggle} className="text-xs text-[var(--accent)] hover:underline">
              {expanded ? "Hide" : "Details"}
            </button>
          )}
        </td>
      </tr>
      {expanded && hasMetadata && (
        <tr className="border-b border-[var(--panel-border)] bg-black/20">
          <td colSpan={5} className="px-5 py-3">
            <pre className="overflow-x-auto text-xs text-[var(--muted)]">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}
