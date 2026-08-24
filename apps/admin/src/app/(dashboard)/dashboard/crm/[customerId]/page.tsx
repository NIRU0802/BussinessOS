"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SkeletonRows } from "@/components/ui/skeleton";
import { PermissionGate } from "@/components/shared/permission-gate";
import { extractApiErrorMessage } from "@/lib/api-client";
import { getCustomer360, prepareBirthdayMessage } from "@/lib/api/customers-api";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function CustomerDetailPage() {
  const params = useParams<{ customerId: string }>();
  const [isPreparing, setIsPreparing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["customer-360", params.customerId],
    queryFn: () => getCustomer360(params.customerId),
  });

  async function handlePrepareBirthday() {
    setIsPreparing(true);
    try {
      const result = await prepareBirthdayMessage(params.customerId);
      window.open(result.whatsappDeepLink, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsPreparing(false);
    }
  }

  if (isLoading || !data) {
    return <SkeletonRows count={8} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{data.customer.name}</h1>
          <p className="text-sm text-slate-500">
            {data.customer.phone}
            {data.customer.email ? ` · ${data.customer.email}` : ""}
          </p>
        </div>
        <PermissionGate permission="customers:update">
          <Button variant="outline" isLoading={isPreparing} onClick={handlePrepareBirthday}>
            Prepare WhatsApp Message
          </Button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-slate-500">Total Orders</p>
            <p className="text-2xl font-semibold text-slate-900">{data.orderStats.totalOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-slate-500">Total Spent</p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatCurrency(data.orderStats.totalSpent, "INR")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-slate-500">Avg Order Value</p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatCurrency(data.orderStats.averageOrderValue, "INR")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentOrders.length === 0 ? (
            <p className="text-sm text-slate-500">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentOrders.map((order) => (
                <li key={order.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-700">
                    #{order.id.slice(0, 8)} · {order.channel} · {formatDateTime(order.createdAt)}
                  </span>
                  <span className="text-slate-900">{formatCurrency(order.total, "INR")}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {data.addresses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Addresses</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.addresses.map((addr) => (
                <li key={addr.id} className="text-sm text-slate-700">
                  <span className="font-medium">{addr.label}</span>
                  {addr.isDefault && <span className="ml-2 text-xs text-slate-400">Default</span>}
                  <p className="text-slate-500">
                    {addr.line1}
                    {addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {data.customer.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700">{data.customer.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
