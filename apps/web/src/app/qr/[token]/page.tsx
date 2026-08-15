"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { QrMenu, type MenuItem } from "@/components/qr-ordering/qr-menu";

interface QrSessionInfo {
  branchId: string;
  tableId: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function QrOrderingPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [session, setSession] = useState<QrSessionInfo | null>(null);
  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const headers = { "x-qr-token": token };

        const sessionRes = await fetch(`${API_URL}/qr/session`, { headers });
        if (!sessionRes.ok) {
          throw new Error(
            sessionRes.status === 401
              ? "This QR code is no longer valid. Please scan the current code at your table."
              : "Could not load your table. Please try scanning again.",
          );
        }
        const sessionData: QrSessionInfo = await sessionRes.json();

        const menuRes = await fetch(`${API_URL}/qr/menu`, { headers });
        if (!menuRes.ok) {
          throw new Error("Could not load the menu. Please try again.");
        }
        const menuData: MenuItem[] = await menuRes.json();

        if (!cancelled) {
          setSession(sessionData);
          setMenu(menuData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const placeOrder = useCallback(
    async (
      items: {
        productId: string;
        variantId?: string;
        modifierOptionIds?: string[];
        quantity: number;
      }[],
    ) => {
      const res = await fetch(`${API_URL}/qr/orders`, {
        method: "POST",
        headers: {
          "x-qr-token": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? "Could not place your order. Please try again.");
      }

      return res.json();
    },
    [token],
  );

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <p className="text-sm text-neutral-500">Loading your table...</p>
      </main>
    );
  }

  if (error || !session || !menu) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-base font-medium text-neutral-900 dark:text-neutral-100">
            {error ?? "Something went wrong."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col">
      <header className="border-b border-neutral-200 dark:border-neutral-800 px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-neutral-500">Table</p>
        <h1 className="text-lg font-semibold">Table {session.tableId.slice(0, 8)}</h1>
      </header>
      <QrMenu items={menu} onPlaceOrder={placeOrder} />
    </main>
  );
}
