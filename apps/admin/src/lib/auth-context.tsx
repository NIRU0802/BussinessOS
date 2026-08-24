"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  bootstrapSessionFromRefreshToken,
  loginRequest,
  logoutRequest,
  onSessionExpired,
} from "./api-client";
import { tokenStorage } from "./token-storage";
import { decodeJwtPayload } from "./jwt";
import type { AuthTenant, AuthUser, LoginRequest, SessionState } from "./types";

interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  tenant: AuthTenant | null;
  session: SessionState | null;
  activeBranchId: string | null;
  setActiveBranchId: (branchId: string | null) => void;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ACTIVE_BRANCH_KEY = "bos_active_branch_id";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tenant, setTenant] = useState<AuthTenant | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [activeBranchId, setActiveBranchIdState] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    tokenStorage.clearAll();
    setUser(null);
    setTenant(null);
    setSession(null);
    setActiveBranchIdState(null);
  }, []);

  const applyAccessToken = useCallback((accessToken: string) => {
    const payload = decodeJwtPayload(accessToken);
    setSession({
      userId: payload.sub,
      tenantId: payload.tenantId,
      branchIds: payload.branchIds,
      isAllBranches: payload.isAllBranches,
      roles: payload.roles,
      permissions: payload.permissions,
    });
  }, []);

  // Boot: try to silently restore a session from the stored refresh token.
  // Access tokens are never persisted, so every hard reload goes through
  // this path.
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        setIsLoading(false);
        return;
      }

      const result = await bootstrapSessionFromRefreshToken();
      if (cancelled) return;

      if (!result) {
        clearSession();
        setIsLoading(false);
        return;
      }

      applyAccessToken(result.accessToken);
      // User/tenant display info isn't in the refresh response body, only
      // in the JWT claims we can reconstruct identity from — email/name
      // aren't in the JWT by design (keep it small), so we keep whatever
      // was last cached from a real login response, if any, and otherwise
      // leave user/tenant null until the next full login. Screens that
      // need user/tenant display info should treat them as optional.
      setIsLoading(false);
    }

    boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onSessionExpired(() => {
      clearSession();
      router.push("/login");
    });
  }, [clearSession, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(ACTIVE_BRANCH_KEY);
    if (stored) setActiveBranchIdState(stored);
  }, []);

  const setActiveBranchId = useCallback((branchId: string | null) => {
    setActiveBranchIdState(branchId);
    if (typeof window === "undefined") return;
    if (branchId) {
      window.localStorage.setItem(ACTIVE_BRANCH_KEY, branchId);
    } else {
      window.localStorage.removeItem(ACTIVE_BRANCH_KEY);
    }
  }, []);

  const login = useCallback(
    async (payload: LoginRequest) => {
      const res = await loginRequest(payload);
      tokenStorage.setAccessToken(res.accessToken);
      tokenStorage.setRefreshToken(res.refreshToken);
      tokenStorage.setTenantSlug(payload.tenantSlug);
      setUser(res.user);
      setTenant(res.tenant);
      applyAccessToken(res.accessToken);

      const payloadDecoded = decodeJwtPayload(res.accessToken);
      const defaultBranch = payloadDecoded.isAllBranches
        ? null
        : (payloadDecoded.branchIds[0] ?? null);
      setActiveBranchId(defaultBranch);

      router.push("/dashboard");
    },
    [applyAccessToken, router, setActiveBranchId],
  );

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      if (refreshToken) await logoutRequest(refreshToken);
    } finally {
      clearSession();
      router.push("/login");
    }
  }, [clearSession, router]);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!session) return false;
      return session.permissions.includes("*") || session.permissions.includes(permission);
    },
    [session],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated: !!session,
      user,
      tenant,
      session,
      activeBranchId,
      setActiveBranchId,
      login,
      logout,
      hasPermission,
    }),
    [
      isLoading,
      session,
      user,
      tenant,
      activeBranchId,
      setActiveBranchId,
      login,
      logout,
      hasPermission,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
