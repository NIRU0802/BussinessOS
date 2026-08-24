"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useOrdersSocket } from "@/hooks/use-orders-socket";
import { listTables, type RestaurantTable } from "@/lib/api/tables-api";
import { getOrderById, type Order } from "@/lib/api/orders-api";
import { TableGrid } from "@/components/floor/table-grid";
import { OrderDetailDrawer } from "@/components/floor/order-detail-drawer";
import { EmptyState } from "@/components/ui/empty-state";

export default function LiveFloorPage() {
  const { activeBranchId, session } = useAuth();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // "All Branches" isn't meaningful for a live table grid — a floor view
  // is inherently per-branch. If no branch is selected yet, fall back to
  // the user's first assigned branch.
  const effectiveBranchId = activeBranchId ?? session?.branchIds[0] ?? null;

  const tablesQuery = useQuery({
    queryKey: ["tables", effectiveBranchId],
    queryFn: () => listTables(effectiveBranchId!),
    enabled: !!effectiveBranchId,
  });

  const { isConnected } = useOrdersSocket({
    branchId: effectiveBranchId,
    onOrderEvent: () => {
      // Any order event could affect table status indirectly; simplest
      // correct approach is to invalidate tables + refetch the open
      // drawer's order rather than trying to patch socket payloads into
      // the query cache by hand.
      queryClient.invalidateQueries({ queryKey: ["tables", effectiveBranchId] });
      if (selectedOrder) {
        getOrderById(selectedOrder.id)
          .then(setSelectedOrder)
          .catch(() => {});
      }
    },
    onTableStatusChanged: () => {
      queryClient.invalidateQueries({ queryKey: ["tables", effectiveBranchId] });
    },
    onVoidRefundRequested: () => {
      queryClient.invalidateQueries({ queryKey: ["orders-pending-approval"] });
      if (selectedOrder) {
        getOrderById(selectedOrder.id)
          .then(setSelectedOrder)
          .catch(() => {});
      }
    },
  });

  async function handleSelectTable(table: RestaurantTable) {
    setSelectedTable(table);
    // Find the table's current open order via list, since Table doesn't
    // directly expose "current order id" in the shapes I've confirmed.
    const orders = await import("@/lib/api/orders-api").then((m) =>
      m.listOrders({ tableId: table.id, status: "open", pageSize: 1 }),
    );
    setSelectedOrder(orders.data[0] ?? null);
  }

  // Deep-link support from the Dashboard Home "Review" button.
  const deepLinkOrderId = searchParams.get("orderId");
  useState(() => {
    if (deepLinkOrderId) {
      getOrderById(deepLinkOrderId)
        .then(setSelectedOrder)
        .catch(() => {});
    }
  });

  if (!effectiveBranchId) {
    return (
      <EmptyState
        title="No branch selected"
        description="Select a branch to view its live floor."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Live Floor</h1>
          <p className="text-sm text-slate-500">Read-only real-time table status.</p>
        </div>
        <span
          className={`text-xs font-medium ${isConnected ? "text-emerald-600" : "text-slate-400"}`}
        >
          {isConnected ? "● Live" : "○ Connecting…"}
        </span>
      </div>

      <TableGrid
        tables={tablesQuery.data ?? []}
        isLoading={tablesQuery.isLoading}
        onSelectTable={handleSelectTable}
      />

      <OrderDetailDrawer
        order={selectedOrder}
        tableLabel={selectedTable?.label ?? null}
        onClose={() => {
          setSelectedOrder(null);
          setSelectedTable(null);
        }}
        onApproved={() => {
          queryClient.invalidateQueries({ queryKey: ["tables", effectiveBranchId] });
          setSelectedOrder(null);
          setSelectedTable(null);
        }}
      />
    </div>
  );
}
