import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { PaymentMethod } from "@/lib/api/billing-api";

interface PaymentMethodCardProps {
  paymentMethod: PaymentMethod | null | undefined;
  isLoading: boolean;
}

export function PaymentMethodCard({ paymentMethod, isLoading }: PaymentMethodCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Method</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-10 w-full" />}

        {!isLoading && !paymentMethod && (
          <EmptyState
            title="No payment method on file"
            description="Your plan is billed directly, not through an automatic payment method."
          />
        )}

        {!isLoading && paymentMethod && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">{paymentMethod.maskedToken}</p>
              <p className="text-xs text-slate-500 capitalize">{paymentMethod.provider}</p>
            </div>
            {paymentMethod.isDefault && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                Default
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
