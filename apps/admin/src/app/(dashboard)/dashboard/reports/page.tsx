"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { ReportTabs } from "@/components/reports/report-tabs";
import { ReportFilters } from "@/components/reports/report-filters";
import { SalesSummaryChart } from "@/components/reports/sales-summary-chart";
import { BestSellersTable } from "@/components/reports/best-sellers-table";
import { BranchRollupTable } from "@/components/reports/branch-rollup-table";
import { AuditLogTable } from "@/components/reports/audit-log-table";
import {
  getSalesSummary,
  getBestSellers,
  getBranchRollup,
  lastNDaysRange,
} from "@/lib/api/reports-api";
import type { ReportPeriod } from "@/lib/enums";

type ReportTab = "sales" | "best-sellers" | "branch-rollup" | "audit-log";

export default function ReportsPage() {
  const { activeBranchId } = useAuth();
  const { hasPermission } = usePermissions();
  const canRollup = hasPermission("reports.read_all_branches");

  const [tab, setTab] = useState<ReportTab>("sales");
  const defaultRange = lastNDaysRange(30);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [period, setPeriod] = useState<ReportPeriod>("day");

  const branchIds = activeBranchId ? [activeBranchId] : undefined;

  const salesQuery = useQuery({
    queryKey: ["sales-summary", startDate, endDate, period, activeBranchId],
    queryFn: () => getSalesSummary({ startDate, endDate, period, branchIds }),
    enabled: tab === "sales",
  });

  const bestSellersQuery = useQuery({
    queryKey: ["best-sellers", startDate, endDate, activeBranchId],
    queryFn: () => getBestSellers({ startDate, endDate, branchIds }),
    enabled: tab === "best-sellers",
  });

  const rollupQuery = useQuery({
    queryKey: ["branch-rollup", startDate, endDate],
    queryFn: () => getBranchRollup({ startDate, endDate }),
    enabled: tab === "branch-rollup" && canRollup,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500">Sales performance and activity history.</p>
      </div>

      <ReportTabs active={tab} onChange={setTab} showBranchRollup={canRollup} />

      {tab !== "audit-log" && (
        <ReportFilters
          startDate={startDate}
          endDate={endDate}
          period={period}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onPeriodChange={setPeriod}
          showPeriod={tab === "sales"}
        />
      )}

      {tab === "sales" && (
        <SalesSummaryChart data={salesQuery.data} isLoading={salesQuery.isLoading} />
      )}
      {tab === "best-sellers" && (
        <BestSellersTable data={bestSellersQuery.data} isLoading={bestSellersQuery.isLoading} />
      )}
      {tab === "branch-rollup" && canRollup && (
        <BranchRollupTable data={rollupQuery.data} isLoading={rollupQuery.isLoading} />
      )}
      {tab === "audit-log" && <AuditLogTable />}
    </div>
  );
}
