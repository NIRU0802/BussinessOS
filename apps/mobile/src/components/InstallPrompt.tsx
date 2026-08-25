"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setVisible(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  if (!visible || dismissed || !deferredPrompt) {
    return null;
  }

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted" || choice.outcome === "dismissed") {
      setVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Install Business OS Mobile POS"
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 9999,
        background: "#0f172a",
        color: "#ffffff",
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Install Business OS POS</span>
        <span style={{ fontSize: 12, opacity: 0.75 }}>
          Add to your home screen for quick access
        </span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={handleDismiss}
          style={{
            background: "transparent",
            color: "#ffffff",
            border: "none",
            fontSize: 13,
            opacity: 0.7,
            padding: "8px 10px",
            cursor: "pointer",
          }}
        >
          Not now
        </button>
        <button
          onClick={handleInstall}
          style={{
            background: "#ffffff",
            color: "#0f172a",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            padding: "8px 14px",
            cursor: "pointer",
          }}
        >
          Install
        </button>
      </div>
    </div>
  );
}
