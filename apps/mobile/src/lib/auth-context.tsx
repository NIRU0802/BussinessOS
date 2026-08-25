"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { tokenStorage } from "./token-storage";
import { decodeJwtPayload } from "./jwt";
import {
  loginRequest,
  logoutRequest,
  bootstrapSessionFromRefreshToken,
  onSessionExpired,
} from "./api-client";
import type { LoginRequest, SessionState } from "./types";

interface AuthContextValue {
  session: SessionState | null;
  loading: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function sessionFromAccessToken(accessToken: string): SessionState {
  const payload = decodeJwtPayload(accessToken);
  return {
    userId: payload.sub,
    tenantId: payload.tenantId,
    branchIds: payload.branchIds,
    isAllBranches: payload.isAllBranches,
    roles: payload.roles,
    permissions: payload.permissions,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    tokenStorage.clearAll();
    setSession(null);
  }, []);

  useEffect(() => {
    onSessionExpired(clearSession);

    (async () => {
      const result = await bootstrapSessionFromRefreshToken();
      if (result) {
        setSession(sessionFromAccessToken(result.accessToken));
      }
      setLoading(false);
    })();
  }, [clearSession]);

  const login = useCallback(async (payload: LoginRequest) => {
    const res = await loginRequest(payload);
    tokenStorage.setAccessToken(res.accessToken);
    tokenStorage.setRefreshToken(res.refreshToken);
    tokenStorage.setTenantSlug(payload.tenantSlug);
    setSession(sessionFromAccessToken(res.accessToken));
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        await logoutRequest(refreshToken);
      } catch {
        // Best-effort — clear local session regardless of server response.
      }
    }
    clearSession();
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{ session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
