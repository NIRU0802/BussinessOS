"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRows } from "@/components/ui/skeleton";
import type { Order } from "@/lib/api/orders-api";
import type { LowStockItem } from "@/lib/api/inventory-api";

interface PendingTasksProps {
  pendingApprovals: Order[];
  lowStockItems: LowStockItem[];
  isLoading: boolean;
}

export function PendingTasks({ pendingApprovals, lowStockItems, isLoading }: PendingTasksProps) {
  const hasTasks = pendingApprovals.length > 0 || lowStockItems.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <SkeletonRows count={4} />
        ) : !hasTasks ? (
          <EmptyState
            title="All caught up"
            description="No pending approvals or low-stock alerts right now."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {pendingApprovals.map((order) => {
              const req = order.voidRefundRequests.find((r) => r.status === "pending");
              return (
                <li key={order.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {req?.type === "refund" ? "Refund" : "Void"} request — Order #
                      {order.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-slate-500">{req?.reason}</p>
                  </div>
                  <Link
                    href={`/dashboard/floor?orderId=${order.id}`}
                    className="text-sm font-medium text-slate-900 hover:underline"
                  >
                    Review
                  </Link>
                </li>
              );
            })}
            {lowStockItems.map((item) => (
              <li
                key={`${item.branchId}-${item.inventoryItemId}`}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Low stock: {item.inventoryItemName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.currentQuantity} {item.unit} left (threshold {item.lowStockThreshold})
                  </p>
                </div>
                <Link
                  href="/dashboard/inventory"
                  className="text-sm font-medium text-slate-900 hover:underline"
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
