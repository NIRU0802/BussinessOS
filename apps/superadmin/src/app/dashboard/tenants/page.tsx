"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/toast-provider";

interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended";
  branchCount: number;
  plan: string | null;
  subscriptionStatus: string | null;
  storageBytes: number;
  imageStorageBytes: number;
  documentStorageBytes: number;
  createdAt: string;
}

interface TenantListResponse {
  data: TenantListItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(1)} ${units[i]}`;
}

export default function TenantsListPage() {
  const { showToast } = useToast();
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [meta, setMeta] = useState<TenantListResponse["meta"] | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("pageSize", "10");

      const res = await api.get<TenantListResponse>(`/super-admin/tenants?${params.toString()}`);
      setTenants(res.data);
      setMeta(res.meta);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load tenants.", "error");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, showToast]);

  useEffect(() => {
    const timeout = setTimeout(fetchTenants, 300);
    return () => clearTimeout(timeout);
  }, [fetchTenants]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  async function handleToggleStatus(tenant: TenantListItem) {
    setBusyId(tenant.id);
    try {
      if (tenant.status === "active") {
        await api.post(`/super-admin/tenants/${tenant.id}/suspend`, {
          reason: "Suspended via Super Admin Portal",
        });
        showToast(`${tenant.name} has been suspended.`, "success");
      } else {
        await api.post(`/super-admin/tenants/${tenant.id}/reactivate`);
        showToast(`${tenant.name} has been reactivated.`, "success");
      }
      await fetchTenants();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Action failed.", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">Tenants</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">All tenants on the platform</p>
      </div>

      <div className="mb-4 flex gap-3">
        <input
          type="text"
          placeholder="Search by name or slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-lg border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-[var(--muted)]">Loading...</div>
      ) : tenants.length === 0 ? (
        <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-8 text-center text-sm text-[var(--muted)]">
          No tenants found.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {tenants.map((t) => (
            <TenantCard
              key={t.id}
              tenant={t}
              busy={busyId === t.id}
              onToggleStatus={() => handleToggleStatus(t)}
            />
          ))}
        </div>
      )}

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

function TenantCard({
  tenant,
  busy,
  onToggleStatus,
}: {
  tenant: TenantListItem;
  busy: boolean;
  onToggleStatus: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <Link
          href={`/dashboard/tenants/${tenant.id}`}
          className="min-w-0 flex-1 text-sm font-medium text-[var(--foreground)] hover:text-[var(--accent)]"
        >
          <div className="truncate">{tenant.name}</div>
        </Link>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
            tenant.status === "active"
              ? "bg-[var(--success)]/15 text-[var(--success)]"
              : "bg-[var(--danger)]/15 text-[var(--danger)]"
          }`}
        >
          {tenant.status}
        </span>
      </div>

      <div className="mb-3 space-y-1 text-xs text-[var(--muted)]">
        <div className="flex justify-between">
          <span>Branches</span>
          <span className="text-[var(--foreground)]">{tenant.branchCount}</span>
        </div>
        <div className="flex justify-between">
          <span>Plan</span>
          <span className="truncate text-[var(--foreground)]">{tenant.plan ?? "None"}</span>
        </div>
      </div>

      <div className="mb-3 rounded-lg bg-white/[0.02] p-2.5 text-[10px]">
        <div className="mb-1 font-medium uppercase tracking-wide text-[var(--muted)]">Storage</div>
        <div className="flex justify-between text-[var(--foreground)]">
          <span>Images</span>
          <span>{formatBytes(tenant.imageStorageBytes)}</span>
        </div>
        <div className="flex justify-between text-[var(--foreground)]">
          <span>Documents</span>
          <span>{formatBytes(tenant.documentStorageBytes)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-[var(--panel-border)] pt-1 font-semibold text-[var(--accent)]">
          <span>Total</span>
          <span>{formatBytes(tenant.storageBytes)}</span>
        </div>
      </div>

      <button
        onClick={onToggleStatus}
        disabled={busy}
        className={`w-full rounded-lg px-2 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
          tenant.status === "active"
            ? "bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20"
            : "bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20"
        }`}
      >
        {busy ? "..." : tenant.status === "active" ? "Suspend" : "Reactivate"}
      </button>
    </div>
  );
}
