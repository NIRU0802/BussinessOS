"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { StatCard } from "@/components/dashboard/stat-card";
import { PendingTasks } from "@/components/dashboard/pending-tasks";
import { PermissionGate } from "@/components/shared/permission-gate";
import { listOrders } from "@/lib/api/orders-api";
import { getSalesSummary, todayDateRange } from "@/lib/api/reports-api";
import { getLowStockSummary } from "@/lib/api/inventory-api";
import { formatCurrency } from "@/lib/utils";

export default function DashboardHomePage() {
  const { activeBranchId } = useAuth();
  const { hasPermission } = usePermissions();

  const salesQuery = useQuery({
    queryKey: ["sales-summary-today", activeBranchId],
    queryFn: () =>
      getSalesSummary({
        ...todayDateRange(),
        period: "day",
        branchIds: activeBranchId ? [activeBranchId] : undefined,
      }),
    enabled: hasPermission("reports.read"),
  });

  const pendingApprovalsQuery = useQuery({
    queryKey: ["orders-pending-approval", activeBranchId],
    queryFn: () =>
      listOrders({
        branchId: activeBranchId ?? undefined,
        pageSize: 50,
      }),
    enabled: hasPermission("orders.approve_void_refund"),
    select: (result) => ({
      ...result,
      data: result.data.filter((o) => o.voidRefundRequests.some((r) => r.status === "pending")),
    }),
  });

  const lowStockQuery = useQuery({
    queryKey: ["low-stock", activeBranchId],
    queryFn: () => getLowStockSummary(activeBranchId ?? undefined),
    enabled: hasPermission("inventory.read"),
  });

  const grandTotal = salesQuery.data?.grandTotal;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Overview of today&apos;s activity{activeBranchId ? "" : " across all branches"}.
        </p>
      </div>

      <PermissionGate permission="reports.read">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Today's Sales"
            value={salesQuery.isLoading ? "—" : formatCurrency(grandTotal?.totalAmount ?? 0, "INR")}
          />
          <StatCard
            label="Orders Today"
            value={salesQuery.isLoading ? "—" : String(grandTotal?.orderCount ?? 0)}
          />
          <PermissionGate permission="inventory.read">
            <StatCard
              label="Low Stock Items"
              value={lowStockQuery.isLoading ? "—" : String(lowStockQuery.data?.length ?? 0)}
              tone={(lowStockQuery.data?.length ?? 0) > 0 ? "warning" : "default"}
            />
          </PermissionGate>
        </div>
      </PermissionGate>

      <PermissionGate permission={["orders.approve_void_refund", "inventory.read"]}>
        <PendingTasks
          pendingApprovals={pendingApprovalsQuery.data?.data ?? []}
          lowStockItems={lowStockQuery.data ?? []}
          isLoading={pendingApprovalsQuery.isLoading || lowStockQuery.isLoading}
        />
      </PermissionGate>
    </div>
  );
}
