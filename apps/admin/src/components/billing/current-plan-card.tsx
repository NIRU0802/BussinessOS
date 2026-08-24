import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Subscription } from "@/lib/api/billing-api";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_LABEL: Record<Subscription["status"], string> = {
  trialing: "Trial",
  active: "Active",
  past_due: "Past due",
  cancelled: "Cancelled",
};

const STATUS_CLASS: Record<Subscription["status"], string> = {
  trialing: "bg-amber-100 text-amber-800",
  active: "bg-green-100 text-green-800",
  past_due: "bg-red-100 text-red-800",
  cancelled: "bg-slate-100 text-slate-600",
};

interface CurrentPlanCardProps {
  subscription: Subscription | null | undefined;
  isLoading: boolean;
}

export function CurrentPlanCard({ subscription, isLoading }: CurrentPlanCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-6 w-40 mb-3" />
          <Skeleton className="h-4 w-64" />
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No active plan"
            description="Your plan hasn't been set up yet. Contact your account manager to get started."
          />
        </CardContent>
      </Card>
    );
  }

  const priceLabel = "Rs " + Number(subscription.plan.price).toLocaleString("en-IN");
  const cycleLabel = priceLabel + " / " + subscription.plan.billingCycle;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Plan</CardTitle>
        <span
          className={
            "rounded-full px-2.5 py-1 text-xs font-medium " + STATUS_CLASS[subscription.status]
          }
        >
          {STATUS_LABEL[subscription.status]}
        </span>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl font-semibold text-slate-900">{subscription.plan.name}</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">{cycleLabel}</p>
        {subscription.plan.description && (
          <p className="mt-2 text-sm text-slate-600">{subscription.plan.description}</p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
          <div>
            <p className="text-xs text-slate-500">Started</p>
            <p className="text-sm font-medium text-slate-900">
              {formatDate(subscription.startedAt)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">
              {subscription.status === "cancelled" ? "Cancelled" : "Renews"}
            </p>
            <p className="text-sm font-medium text-slate-900">
              {subscription.cancelledAt
                ? formatDate(subscription.cancelledAt)
                : formatDate(subscription.renewalDate)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
