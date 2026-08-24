"use client";

import { useQuery } from "@tanstack/react-query";
import { getCurrentSubscription, getInvoices, getPaymentMethod } from "@/lib/api/billing-api";
import { listBranches } from "@/lib/api/branches-api";
import { listStaff } from "@/lib/api/staff-api";
import { CurrentPlanCard } from "@/components/billing/current-plan-card";
import { UsageLimitsCard } from "@/components/billing/usage-limits-card";
import { InvoiceHistoryTable } from "@/components/billing/invoice-history-table";
import { PaymentMethodCard } from "@/components/billing/payment-method-card";

export default function BillingPage() {
  const subscriptionQuery = useQuery({
    queryKey: ["billing-subscription"],
    queryFn: getCurrentSubscription,
  });

  const invoicesQuery = useQuery({
    queryKey: ["billing-invoices"],
    queryFn: getInvoices,
  });

  const paymentMethodQuery = useQuery({
    queryKey: ["billing-payment-method"],
    queryFn: getPaymentMethod,
  });

  const branchesQuery = useQuery({
    queryKey: ["branches-for-usage"],
    queryFn: listBranches,
  });

  const staffQuery = useQuery({
    queryKey: ["staff-for-usage"],
    queryFn: listStaff,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Billing</h1>
        <p className="text-sm text-slate-500">Your plan, usage, and invoice history.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CurrentPlanCard
          subscription={subscriptionQuery.data}
          isLoading={subscriptionQuery.isLoading}
        />
        <UsageLimitsCard
          subscription={subscriptionQuery.data}
          isLoading={subscriptionQuery.isLoading || branchesQuery.isLoading || staffQuery.isLoading}
          branchCount={branchesQuery.data?.length ?? 0}
          userCount={staffQuery.data?.length ?? 0}
        />
      </div>

      <InvoiceHistoryTable invoices={invoicesQuery.data} isLoading={invoicesQuery.isLoading} />

      <PaymentMethodCard
        paymentMethod={paymentMethodQuery.data}
        isLoading={paymentMethodQuery.isLoading}
      />
    </div>
  );
}
