"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/toast-provider";

interface CustomerListItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  dob: string | null;
  totalOrders: number;
  totalSpent: string;
  lastOrderAt: string | null;
  createdAt: string;
  businessName: string;
  businessSlug: string;
  tenantId: string;
}

interface CustomerListResponse {
  data: CustomerListItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function CustomerDataPage() {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [meta, setMeta] = useState<CustomerListResponse["meta"] | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("pageSize", "20");

      const res = await api.get<CustomerListResponse>(
        `/super-admin/customers?${params.toString()}`,
      );
      setCustomers(res.data);
      setMeta(res.meta);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load customer data.", "error");
    } finally {
      setLoading(false);
    }
  }, [search, page, showToast]);

  useEffect(() => {
    const timeout = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(timeout);
  }, [fetchCustomers]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">Customer Data</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Every customer across every business on the platform. GR8-only view.
        </p>
      </div>

      <div className="mb-4 flex gap-3">
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-80 rounded-lg border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
        />
      </div>

      {loading ? (
        <div className="text-sm text-[var(--muted)]">Loading...</div>
      ) : customers.length === 0 ? (
        <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-8 text-center text-sm text-[var(--muted)]">
          No customers found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--panel-border)] text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">DOB</th>
                <th className="px-4 py-3 font-medium">Business</th>
                <th className="px-4 py-3 font-medium">Orders</th>
                <th className="px-4 py-3 font-medium">Total Spent</th>
                <th className="px-4 py-3 font-medium">Last Order</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-[var(--panel-border)] text-[var(--foreground)] last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{c.phone}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatDate(c.dob)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-xs">
                      {c.businessName}
                    </span>
                  </td>
                  <td className="px-4 py-3">{c.totalOrders}</td>
                  <td className="px-4 py-3">₹{c.totalSpent}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatDate(c.lastOrderAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
