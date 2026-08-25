"use client";

import { useEffect, useState } from "react";
import { createContext, useContext } from "react";

// -----------------------------------------------------------------------
// Mobile POS is ONLINE-ONLY by design (no local DB, no offline queue).
// This component/context exists purely to:
//   1. Show a "Reconnecting..." banner when navigator.onLine is false
//   2. Expose isOnline so order-submission actions can be disabled
// It does NOT queue, cache, or retry any order data.
// -----------------------------------------------------------------------

const OnlineStatusContext = createContext<boolean>(true);

export function useIsOnline(): boolean {
  return useContext(OnlineStatusContext);
}

export function OfflineStatusProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <OnlineStatusContext.Provider value={isOnline}>
      {!isOnline && <OfflineBanner />}
      {children}
    </OnlineStatusContext.Provider>
  );
}

function OfflineBanner() {
  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        background: "#b91c1c",
        color: "#ffffff",
        textAlign: "center",
        padding: "8px 12px",
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      Reconnecting... Order actions are disabled until connection is restored.
    </div>
  );
}

/**
 * Wrap any order-submission button/action with this to disable it while
 * offline. Does not queue the action — simply blocks it, per the online-only
 * design for Mobile POS.
 */
export function useDisableWhenOffline(): { disabled: boolean; reason: string | null } {
  const isOnline = useIsOnline();
  return {
    disabled: !isOnline,
    reason: isOnline ? null : "You are offline. Reconnect to submit orders.",
  };
}
