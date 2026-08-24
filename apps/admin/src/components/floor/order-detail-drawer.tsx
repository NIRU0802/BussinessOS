"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/shared/permission-gate";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { approveVoidRefund, type Order } from "@/lib/api/orders-api";
import { extractApiErrorMessage } from "@/lib/api-client";

interface OrderDetailDrawerProps {
  order: Order | null;
  tableLabel: string | null;
  onClose: () => void;
  onApproved: () => void;
}

export function OrderDetailDrawer({
  order,
  tableLabel,
  onClose,
  onApproved,
}: OrderDetailDrawerProps) {
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  if (!order) return null;

  const pendingRequest = order.voidRefundRequests.find((r) => r.status === "pending");

  async function handleDecision(requestId: string, approve: boolean) {
    setProcessingRequestId(requestId);
    try {
      await approveVoidRefund(order!.id, requestId, approve);
      toast.success(approve ? "Request approved" : "Request rejected");
      onApproved();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setProcessingRequestId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
      <div className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {tableLabel ?? "Order"} — #{order.id.slice(0, 8)}
            </h2>
            <p className="text-xs text-slate-500">
              {formatDateTime(order.createdAt)} · {order.channel} · {order.status}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900">
            ✕
          </button>
        </div>

        {pendingRequest && (
          <PermissionGate permission="orders.approve_void_refund">
            <div className="mx-5 mt-4 rounded-md border border-amber-300 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-900">
                {pendingRequest.type === "refund" ? "Refund" : "Void"} requested
              </p>
              <p className="mt-1 text-sm text-amber-800">{pendingRequest.reason}</p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  isLoading={processingRequestId === pendingRequest.id}
                  onClick={() => handleDecision(pendingRequest.id, true)}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  isLoading={processingRequestId === pendingRequest.id}
                  onClick={() => handleDecision(pendingRequest.id, false)}
                >
                  Reject
                </Button>
              </div>
            </div>
          </PermissionGate>
        )}

        <div className="flex-1 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">Items</h3>
          {/* Item names aren't stored on OrderItem (only productId) — once
              the Menu module's product-lookup API exists (Chunk 3), this
              should resolve productId -> product name via a batched lookup
              instead of showing the raw id. */}
          <ul className="mt-2 divide-y divide-slate-100">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-slate-900">
                    {item.quantity} × Product #{item.productId.slice(0, 8)}
                  </p>
                </div>
                <span className="text-sm text-slate-700">
                  {formatCurrency(Number(item.unitPrice) * item.quantity, "INR")}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatCurrency(Number(order.subtotal), "INR")}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tax</span>
              <span>{formatCurrency(Number(order.taxAmount), "INR")}</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-900">
              <span>Total</span>
              <span>{formatCurrency(Number(order.total), "INR")}</span>
            </div>
          </div>

          {order.payments.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-900">Payments</h3>
              <ul className="mt-2 divide-y divide-slate-100">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <span className="capitalize text-slate-700">{p.method}</span>
                      <span className="ml-2 text-xs text-slate-400 capitalize">{p.status}</span>
                    </div>
                    <span className="text-slate-900">
                      {formatCurrency(Number(p.amount), "INR")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
