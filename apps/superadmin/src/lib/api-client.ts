const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const TOKEN_KEY = "superadmin_access_token";
const REFRESH_KEY = "superadmin_refresh_token";
const ADMIN_KEY = "superadmin_info";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(REFRESH_KEY);
}

export function setRefreshToken(token: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(REFRESH_KEY, token);
}

export function clearRefreshToken(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(REFRESH_KEY);
}

export interface AdminInfo {
  id: string;
  email: string;
  fullName: string;
  adminType: "GR8" | "TEAM";
}

export function getAdmin(): AdminInfo | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(ADMIN_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setAdmin(admin: AdminInfo): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

export function clearAdmin(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ADMIN_KEY);
}

function clearSession(): void {
  clearToken();
  clearRefreshToken();
  clearAdmin();
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

// Prevents multiple simultaneous requests from all triggering their own
// refresh call when a token expires - they share one in-flight refresh.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const currentRefreshToken = getRefreshToken();
    if (!currentRefreshToken) {
      return null;
    }

    try {
      const res = await fetch(API_URL + "/super-admin/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });

      if (!res.ok) {
        return null;
      }

      const data: RefreshResponse = await res.json();
      setToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      return data.accessToken;
    } catch {
      return null;
    }
  })();

  const result = await refreshPromise;
  refreshPromise = null;
  return result;
}

async function request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const token = getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = "Bearer " + token;
  }

  const res = await fetch(API_URL + path, {
    ...options,
    headers,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // On 401, try a silent refresh once before giving up. This is what
    // gives admins an uninterrupted session while the tab stays open -
    // they never see a login screen just because 15 minutes passed.
    if (res.status === 401 && !isRetry && typeof window !== "undefined") {
      const newToken = await refreshAccessToken();

      if (newToken) {
        return request<T>(path, options, true);
      }

      // Refresh token itself is invalid/expired/revoked - this is the
      // only case where we actually log the admin out.
      clearSession();
      window.location.href = "/login";
    }

    const message = (data && (data.message || data.error)) || "Request failed (" + res.status + ")";
    throw new ApiError(Array.isArray(message) ? message.join(", ") : message, res.status);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
