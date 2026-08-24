"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PermissionGate } from "@/components/shared/permission-gate";
import { CustomerFormDialog } from "@/components/crm/customer-form-dialog";
import { BirthdayRemindersPanel } from "@/components/crm/birthday-reminders-panel";
import { listCustomers } from "@/lib/api/customers-api";
import { formatCurrency } from "@/lib/utils";

export default function CrmPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["customers", search],
    queryFn: () => listCustomers({ search: search || undefined, page: 1, limit: 50 }),
  });

  const customers = data?.items ?? [];

  function refetch() {
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500">Customer profiles and order history.</p>
        </div>
        <PermissionGate permission="customers:create">
          <Button onClick={() => setFormOpen(true)}>New Customer</Button>
        </PermissionGate>
      </div>

      <BirthdayRemindersPanel />

      <Input
        placeholder="Search by name or phone"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <Card>
        <CardContent>
          {isLoading ? (
            <SkeletonRows count={6} />
          ) : customers.length === 0 ? (
            <EmptyState title="No customers found" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {customers.map((customer) => (
                <li key={customer.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{customer.name}</p>
                    <p className="text-xs text-slate-500">
                      {customer.phone} · {customer.totalOrders} orders ·{" "}
                      {formatCurrency(Number(customer.totalSpent), "INR")} lifetime
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/crm/${customer.id}`}
                    className="text-sm text-slate-600 hover:text-slate-900"
                  >
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <CustomerFormDialog
        open={formOpen}
        customer={null}
        onClose={() => setFormOpen(false)}
        onSaved={refetch}
      />
    </div>
  );
}
