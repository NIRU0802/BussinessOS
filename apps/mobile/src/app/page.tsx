"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useDisableWhenOffline } from "@/components/OfflineBanner";
import { BranchPicker } from "@/components/BranchPicker";
import { fetchEffectiveMenu, createOrder, extractApiErrorMessage } from "@/lib/api-client";
import { tokenStorage } from "@/lib/token-storage";
import type { EffectiveMenuItem, CreateOrderItemPayload, CreatedOrder } from "@/lib/types";

interface CartLine {
  item: EffectiveMenuItem;
  quantity: number;
}

export default function HomePage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useAuth();
  const { disabled, reason } = useDisableWhenOffline();

  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [menu, setMenu] = useState<EffectiveMenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<CreatedOrder | null>(null);

  useEffect(() => {
    if (!sessionLoading && !session) {
      router.push("/login");
    }
  }, [sessionLoading, session, router]);

  // Default to the first assigned branch once session loads. If staff has
  // more than one, BranchPicker lets them switch — this just sets the
  // initial value.
  useEffect(() => {
    if (session && session.branchIds.length > 0 && !activeBranchId) {
      setActiveBranchId(session.branchIds[0]);
    }
  }, [session, activeBranchId]);

  useEffect(() => {
    if (!activeBranchId) return;
    setMenuLoading(true);
    setMenuError(null);
    setCart([]); // clear cart when switching branches — prices/availability differ per branch
    fetchEffectiveMenu(activeBranchId)
      .then(setMenu)
      .catch((err) => setMenuError(extractApiErrorMessage(err)))
      .finally(() => setMenuLoading(false));
  }, [activeBranchId]);

  if (sessionLoading || !session) {
    return <main style={{ padding: 24 }}>Loading session...</main>;
  }

  if (session.branchIds.length === 0) {
    return (
      <main style={{ padding: 24 }}>
        <p style={{ color: "#b91c1c" }}>
          This staff account has no branch assigned. Contact your admin.
        </p>
      </main>
    );
  }

  const addItem = (item: EffectiveMenuItem) => {
    setCart((prev) => {
      const existing = prev.find((line) => line.item.id === item.id);
      if (existing) {
        return prev.map((line) =>
          line.item.id === item.id ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeItem = (itemId: string) => {
    setCart((prev) =>
      prev
        .map((line) => (line.item.id === itemId ? { ...line, quantity: line.quantity - 1 } : line))
        .filter((line) => line.quantity > 0),
    );
  };

  // This is a DISPLAY-ONLY estimate shown before submission. It is NOT
  // sent as the final total — the server always independently recomputes
  // tax (OrdersService.createOrder -> recomputeTax) and its response is
  // the only authoritative source of truth for what the customer owes.
  const estimatedSubtotal = cart.reduce(
    (sum, line) => sum + line.item.effectivePrice * line.quantity,
    0,
  );

  const handleSubmitOrder = async () => {
    if (disabled || cart.length === 0 || !activeBranchId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const items: CreateOrderItemPayload[] = cart.map((line) => ({
        productId: line.item.id,
        quantity: line.quantity,
        unitPrice: line.item.effectivePrice.toFixed(2),
      }));

      const subtotal = estimatedSubtotal.toFixed(2);
      // taxAmount/total sent here are only a preview — there is no tax
      // preview endpoint (confirmed: apps/api's TaxController only has
      // classes/rules CRUD, no calculate route). The server always
      // recomputes both authoritatively in recomputeTax() and returns the
      // real values in the response below, which is what we display.
      const previewTaxAmount = "0.00";
      const previewTotal = subtotal;

      const created = await createOrder({
        branchId: activeBranchId,
        deviceId: tokenStorage.getOrCreateDeviceId(),
        clientGeneratedId: crypto.randomUUID(),
        channel: "pos",
        items,
        subtotal,
        taxAmount: previewTaxAmount,
        total: previewTotal,
      });

      setLastOrder(created);
      setCart([]);
    } catch (err) {
      setSubmitError(extractApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ padding: 20, paddingBottom: 140 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Business OS Mobile POS</h1>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
        Tap items to add to the order
      </p>

      {activeBranchId && (
        <BranchPicker
          branchIds={session.branchIds}
          activeBranchId={activeBranchId}
          onSelect={setActiveBranchId}
        />
      )}

      {menuLoading && <p style={{ fontSize: 13, color: "#64748b" }}>Loading menu...</p>}
      {menuError && <p style={{ fontSize: 13, color: "#b91c1c" }}>{menuError}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {menu.map((item) => {
          const line = cart.find((l) => l.item.id === item.id);
          return (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 16px",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                background: item.isAvailable ? "#ffffff" : "#f1f5f9",
                opacity: item.isAvailable ? 1 : 0.6,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {item.categoryName} · ₹{item.effectivePrice}
                  {!item.isAvailable && " · Unavailable"}
                </div>
              </div>

              {item.isAvailable && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {line && (
                    <>
                      <button onClick={() => removeItem(item.id)} style={qtyButtonStyle}>
                        −
                      </button>
                      <span style={{ fontSize: 14, minWidth: 16, textAlign: "center" }}>
                        {line.quantity}
                      </span>
                    </>
                  )}
                  <button onClick={() => addItem(item)} style={qtyButtonStyle}>
                    +
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#ffffff",
          borderTop: "1px solid #e2e8f0",
          padding: "14px 20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 10,
            fontSize: 14,
          }}
        >
          <span>{cart.reduce((n, l) => n + l.quantity, 0)} item(s)</span>
          <span style={{ fontWeight: 700 }}>₹{estimatedSubtotal.toFixed(2)} (excl. tax)</span>
        </div>

        {disabled && <p style={{ fontSize: 12, color: "#b91c1c", marginBottom: 8 }}>{reason}</p>}
        {submitError && (
          <p style={{ fontSize: 12, color: "#b91c1c", marginBottom: 8 }}>{submitError}</p>
        )}

        <button
          onClick={handleSubmitOrder}
          disabled={disabled || cart.length === 0 || submitting}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 10,
            border: "none",
            background: disabled || cart.length === 0 ? "#cbd5e1" : "#0f172a",
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 600,
            cursor: disabled || cart.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Submitting..." : "Submit Order"}
        </button>

        {lastOrder && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#16a34a", textAlign: "center" }}>
            <p>Order submitted successfully.</p>
            <p style={{ marginTop: 4 }}>
              Subtotal ₹{lastOrder.subtotal} · Tax ₹{lastOrder.taxAmount} · Total ₹{lastOrder.total}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

const qtyButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  fontSize: 16,
  cursor: "pointer",
};
