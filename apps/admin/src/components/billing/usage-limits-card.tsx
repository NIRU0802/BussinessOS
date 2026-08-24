import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Subscription } from "@/lib/api/billing-api";

interface UsageRowProps {
  label: string;
  used: number;
  max: number | null;
}

function UsageRow({ label, used, max }: UsageRowProps) {
  const unlimited = max === null;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(max, 1)) * 100));
  const isNearLimit = !unlimited && pct >= 80;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-900">
          {used} {unlimited ? "" : `/ ${max}`}
        </span>
      </div>
      {!unlimited && (
        <div className="h-2 w-full rounded-full bg-slate-100">
          <div
            className={`h-2 rounded-full ${isNearLimit ? "bg-red-500" : "bg-slate-900"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface UsageLimitsCardProps {
  subscription: Subscription | null | undefined;
  isLoading: boolean;
  branchCount: number;
  userCount: number;
}

export function UsageLimitsCard({
  subscription,
  isLoading,
  branchCount,
  userCount,
}: UsageLimitsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!subscription) return null;

  const { limits } = subscription.plan;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage vs Limits</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <UsageRow label="Branches" used={branchCount} max={limits.maxBranches} />
        <UsageRow label="Users" used={userCount} max={limits.maxUsers} />
      </CardContent>
    </Card>
  );
}
