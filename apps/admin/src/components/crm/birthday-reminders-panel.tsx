"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRows } from "@/components/ui/skeleton";
import { extractApiErrorMessage } from "@/lib/api-client";
import { listCustomers, prepareBirthdayMessage } from "@/lib/api/customers-api";

export function BirthdayRemindersPanel() {
  const [preparingId, setPreparingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["customers-for-birthday-check"],
    queryFn: () => listCustomers({ page: 1, limit: 100 }),
  });

  const customers = data?.items ?? [];
  const today = new Date();
  const todaysBirthdays = customers.filter((c) => {
    if (!c.dob) return false;
    const dob = new Date(c.dob);
    return dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate();
  });

  async function handlePrepare(customerId: string) {
    setPreparingId(customerId);
    try {
      const result = await prepareBirthdayMessage(customerId);
      window.open(result.whatsappDeepLink, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setPreparingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Birthdays Today</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <SkeletonRows count={2} />
        ) : todaysBirthdays.length === 0 ? (
          <EmptyState title="No birthdays today" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {todaysBirthdays.map((customer) => (
              <li key={customer.id} className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-900">{customer.name}</span>
                <Button
                  size="sm"
                  variant="outline"
                  isLoading={preparingId === customer.id}
                  onClick={() => handlePrepare(customer.id)}
                >
                  Prepare WhatsApp Message
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
