import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { config } from "./config";
import { tokenStorage } from "./token-storage";
import { decodeJwtPayload } from "./jwt";
import type { ApiErrorBody, LoginRequest, LoginResponse, RefreshResponse } from "./types";

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Fired whenever the session becomes unrecoverable (refresh failed / no
// refresh token). The AuthProvider subscribes to this to clear its state
// and redirect to /login, without api-client needing to know about React.
type SessionExpiredListener = () => void;
let sessionExpiredListener: SessionExpiredListener | null = null;

export function onSessionExpired(listener: SessionExpiredListener) {
  sessionExpiredListener = listener;
}

const apiClient: AxiosInstance = axios.create({
  baseURL: config.apiUrl,
  timeout: 20000,
});

apiClient.interceptors.request.use((req) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    req.headers.set("Authorization", `Bearer ${token}`);
  }
  return req;
});

// Deduplicates concurrent refresh attempts: if five requests 401 at once,
// only one refresh call is made and the rest await its result.
let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await axios.post<RefreshResponse>(`${config.apiUrl}/auth/refresh`, {
      refreshToken,
    });
    tokenStorage.setAccessToken(res.data.accessToken);
    tokenStorage.setRefreshToken(res.data.refreshToken);
    return res.data.accessToken;
  } catch {
    return null;
  }
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiErrorBody>) => {
    const originalRequest = error.config as RetryableConfig | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = performRefresh().finally(() => {
          refreshPromise = null;
        });
      }

      const newAccessToken = await refreshPromise;

      if (newAccessToken) {
        originalRequest.headers.set("Authorization", `Bearer ${newAccessToken}`);
        return apiClient(originalRequest);
      }

      tokenStorage.clearAll();
      sessionExpiredListener?.();
    }

    return Promise.reject(error);
  },
);

export function extractApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;
    if (body?.message) {
      return Array.isArray(body.message) ? body.message.join(", ") : body.message;
    }
    if (error.message) return error.message;
  }
  return "Something went wrong. Please try again.";
}

// ---- Auth endpoints ----

export async function loginRequest(payload: LoginRequest): Promise<LoginResponse> {
  const res = await axios.post<LoginResponse>(`${config.apiUrl}/auth/login`, payload);
  return res.data;
}

export async function logoutRequest(refreshToken: string): Promise<void> {
  await axios.post(`${config.apiUrl}/auth/logout`, { refreshToken });
}

export async function bootstrapSessionFromRefreshToken(): Promise<{
  accessToken: string;
} | null> {
  const accessToken = await performRefresh();
  if (!accessToken) return null;
  // Validate it decodes cleanly before handing back to the caller.
  decodeJwtPayload(accessToken);
  return { accessToken };
}

export default apiClient;
