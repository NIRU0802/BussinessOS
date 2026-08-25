"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useDisableWhenOffline } from "@/components/OfflineBanner";
import { fetchEffectiveMenu, createOrder, extractApiErrorMessage } from "@/lib/api-client";
import { tokenStorage } from "@/lib/token-storage";
import type { EffectiveMenuItem, CreateOrderItemPayload } from "@/lib/types";

interface CartLine {
  item: EffectiveMenuItem;
  quantity: number;
}

export default function HomePage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useAuth();
  const { disabled, reason } = useDisableWhenOffline();

  const [menu, setMenu] = useState<EffectiveMenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Staff can have multiple branches (JWT.branchIds is an array). This
  // takes the first assigned branch as the active POS branch. If your
  // staff regularly work multiple branches, this needs a real branch
  // switcher — flagging as a known gap rather than guessing a UI for it.
  const branchId = session?.branchIds[0];

  useEffect(() => {
    if (!sessionLoading && !session) {
      router.push("/login");
    }
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!branchId) return;
    setMenuLoading(true);
    setMenuError(null);
    fetchEffectiveMenu(branchId)
      .then(setMenu)
      .catch((err) => setMenuError(extractApiErrorMessage(err)))
      .finally(() => setMenuLoading(false));
  }, [branchId]);

  if (sessionLoading || !session) {
    return <main style={{ padding: 24 }}>Loading session...</main>;
  }

  if (!branchId) {
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

  const total = cart.reduce((sum, line) => sum + line.item.effectivePrice * line.quantity, 0);

  const handleSubmitOrder = async () => {
    if (disabled || cart.length === 0 || !branchId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const items: CreateOrderItemPayload[] = cart.map((line) => ({
        productId: line.item.id,
        quantity: line.quantity,
        unitPrice: line.item.effectivePrice.toFixed(2),
      }));

      const subtotal = total.toFixed(2);
      // NOTE: tax calculation isn't wired here — Phase 2's Tax Engine
      // should supply the real taxAmount. Sending 0.00 as a placeholder;
      // replace once the tax-calculation endpoint/shape is confirmed.
      const taxAmount = "0.00";
      const orderTotal = (total + Number(taxAmount)).toFixed(2);

      await createOrder({
        branchId,
        deviceId: tokenStorage.getOrCreateDeviceId(),
        clientGeneratedId: crypto.randomUUID(),
        channel: "pos",
        items,
        subtotal,
        taxAmount,
        total: orderTotal,
      });

      setSubmitted(true);
      setCart([]);
    } catch (err) {
      setSubmitError(extractApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ padding: 20, paddingBottom: 120 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Business OS Mobile POS</h1>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
        Tap items to add to the order
      </p>

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
          <span style={{ fontWeight: 700 }}>₹{total.toFixed(2)}</span>
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

        {submitted && (
          <p style={{ fontSize: 12, color: "#16a34a", marginTop: 8, textAlign: "center" }}>
            Order submitted successfully.
          </p>
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
