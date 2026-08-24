"use client";

import { Card, CardContent } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";
import type { BranchRollupResult } from "@/lib/api/reports-api";

interface BranchRollupTableProps {
  data: BranchRollupResult | undefined;
  isLoading: boolean;
}

export function BranchRollupTable({ data, isLoading }: BranchRollupTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <SkeletonRows count={5} />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.branches.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState title="No data for this period" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-slate-500">Combined across all branches</p>
          <p className="text-2xl font-semibold text-slate-900">
            {formatCurrency(data.combined.totalAmount, "INR")}
          </p>
          <p className="text-xs text-slate-400">
            {data.combined.orderCount} orders · avg{" "}
            {formatCurrency(data.combined.averageOrderValue, "INR")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="pb-2">Branch</th>
                <th className="pb-2 text-right">Orders</th>
                <th className="pb-2 text-right">Revenue</th>
                <th className="pb-2 text-right">Avg Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.branches.map((b) => (
                <tr key={b.branchId}>
                  <td className="py-2 text-slate-900">{b.branchName}</td>
                  <td className="py-2 text-right text-slate-600">{b.orderCount}</td>
                  <td className="py-2 text-right text-slate-900">
                    {formatCurrency(b.totalAmount, "INR")}
                  </td>
                  <td className="py-2 text-right text-slate-600">
                    {formatCurrency(b.averageOrderValue, "INR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
