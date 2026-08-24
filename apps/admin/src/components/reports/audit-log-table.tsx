"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { listAuditLogs } from "@/lib/api/audit-log-api";
import { downloadCsv } from "@/lib/csv-export";
import { formatDateTime } from "@/lib/utils";

export function AuditLogTable() {
  const [entityType, setEntityType] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["audit-logs", entityType],
    queryFn: () => listAuditLogs({ entityType: entityType || undefined, take: 200 }),
  });

  function handleExportCsv() {
    downloadCsv(
      `audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
      data.map((entry) => ({
        timestamp: entry.createdAt,
        action: entry.action,
        entityType: entry.entityType ?? "",
        entityId: entry.entityId ?? "",
        userId: entry.userId ?? "",
        ipAddress: entry.ipAddress ?? "",
      })),
    );
  }

  return (
    <div className="space-y-4">
      {/* PDF/Excel export was requested in the spec but there's no backend
          export endpoint — this generates a CSV client-side from the same
          data the table shows. A real PDF/Excel export would need a
          backend endpoint (e.g. GET /audit-logs/export?format=pdf). */}
      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder="Filter by entity type (e.g. Order)"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="outline" onClick={handleExportCsv} disabled={data.length === 0}>
          Export CSV
        </Button>
      </div>

      <Card>
        <CardContent>
          {isLoading ? (
            <SkeletonRows count={6} />
          ) : data.length === 0 ? (
            <EmptyState title="No audit log entries" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Action</th>
                  <th className="pb-2">Entity</th>
                  <th className="pb-2">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-2 text-slate-600">{formatDateTime(entry.createdAt)}</td>
                    <td className="py-2 text-slate-900">{entry.action}</td>
                    <td className="py-2 text-slate-600">
                      {entry.entityType
                        ? `${entry.entityType} · ${entry.entityId?.slice(0, 8)}`
                        : "—"}
                    </td>
                    <td className="py-2 text-slate-400">{entry.ipAddress ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
