"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import type { SalesSummaryResult } from "@/lib/api/reports-api";

interface SalesSummaryChartProps {
  data: SalesSummaryResult | undefined;
  isLoading: boolean;
}

export function SalesSummaryChart({ data, isLoading }: SalesSummaryChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <SkeletonRows count={4} />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.points.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-slate-500">No sales data for this period.</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.points.map((p) => ({
    date: new Date(p.periodStart).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
    }),
    revenue: p.totalAmount,
    orders: p.orderCount,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-slate-500">Total Revenue</p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatCurrency(data.grandTotal.totalAmount, "INR")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-slate-500">Total Orders</p>
            <p className="text-2xl font-semibold text-slate-900">{data.grandTotal.orderCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-slate-500">Avg Order Value</p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatCurrency(data.grandTotal.averageOrderValue, "INR")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0), "INR")}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0f172a"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
