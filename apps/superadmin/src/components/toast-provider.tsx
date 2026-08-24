"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const config = {
    success: { color: "var(--success)", icon: "check" },
    error: { color: "var(--danger)", icon: "error" },
    info: { color: "var(--accent)", icon: "info" },
  }[toast.type];

  return (
    <div
      className="flex min-w-[280px] max-w-sm items-center gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 shadow-xl animate-toast-in"
      style={{ borderLeftWidth: 3, borderLeftColor: config.color }}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: config.color }} />
      <span className="flex-1 text-sm text-[var(--foreground)]">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        Dismiss
      </button>
    </div>
  );
}
