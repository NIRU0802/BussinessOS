import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PnlResult } from "@/lib/api/expenses-api";

function formatAmount(n: number): string {
  return "Rs " + n.toLocaleString("en-IN");
}

interface PnlViewProps {
  data: PnlResult | undefined;
  isLoading: boolean;
}

export function PnlView({ data, isLoading }: PnlViewProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profit &amp; Loss</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const isProfit = data.netProfit >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit &amp; Loss</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs text-slate-500">Revenue</p>
            <p className="text-lg font-semibold text-slate-900">
              {formatAmount(data.revenue.total)}
            </p>
            <p className="text-xs text-slate-400">{data.revenue.paidOrderCount} paid orders</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Expenses</p>
            <p className="text-lg font-semibold text-slate-900">
              {formatAmount(data.expenses.total)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Net Profit</p>
            <p
              className={"text-lg font-semibold " + (isProfit ? "text-green-700" : "text-red-700")}
            >
              {formatAmount(data.netProfit)}
            </p>
          </div>
        </div>

        {data.expenses.byCategory.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-slate-500">Expenses by category</p>
            <div className="space-y-1.5">
              {data.expenses.byCategory.map((c) => (
                <div key={c.categoryId} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{c.categoryName}</span>
                  <span className="font-medium text-slate-900">{formatAmount(c.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
