"use client";

import { Card, CardContent } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";
import type { BestSellerItem } from "@/lib/api/reports-api";

interface BestSellersTableProps {
  data: BestSellerItem[] | undefined;
  isLoading: boolean;
}

export function BestSellersTable({ data, isLoading }: BestSellersTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <SkeletonRows count={5} />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState title="No sales in this period" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
              <th className="pb-2">Item</th>
              {data[0].branchName && <th className="pb-2">Branch</th>}
              <th className="pb-2 text-right">Qty Sold</th>
              <th className="pb-2 text-right">Revenue</th>
              <th className="pb-2 text-right">Orders</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item, i) => (
              <tr key={`${item.menuItemId}-${item.branchId ?? "all"}-${i}`}>
                <td className="py-2 text-slate-900">{item.itemName}</td>
                {item.branchName && <td className="py-2 text-slate-600">{item.branchName}</td>}
                <td className="py-2 text-right text-slate-900">{item.quantitySold}</td>
                <td className="py-2 text-right text-slate-900">
                  {formatCurrency(item.revenue, "INR")}
                </td>
                <td className="py-2 text-right text-slate-600">{item.orderCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
