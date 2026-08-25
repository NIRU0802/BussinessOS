import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { config } from "./config";
import { tokenStorage } from "./token-storage";
import { decodeJwtPayload } from "./jwt";
import type {
  ApiErrorBody,
  LoginRequest,
  LoginResponse,
  RefreshResponse,
  EffectiveMenuItem,
  CreateOrderPayload,
} from "./types";

// Identical auth/refresh pattern to apps/admin/src/lib/api-client.ts, plus
// menu + order calls specific to Mobile POS.

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

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

// ---- Auth ----

export async function loginRequest(payload: LoginRequest): Promise<LoginResponse> {
  const res = await axios.post<LoginResponse>(`${config.apiUrl}/auth/login`, payload);
  return res.data;
}

export async function logoutRequest(refreshToken: string): Promise<void> {
  await axios.post(`${config.apiUrl}/auth/logout`, { refreshToken });
}

export async function bootstrapSessionFromRefreshToken(): Promise<{ accessToken: string } | null> {
  const accessToken = await performRefresh();
  if (!accessToken) return null;
  decodeJwtPayload(accessToken);
  return { accessToken };
}

// ---- Menu ----

/**
 * Calls GET /menu/branch/:branchId/effective — requires 'menu.read'
 * permission, enforced server-side by the global PermissionsGuard.
 */
export async function fetchEffectiveMenu(branchId: string): Promise<EffectiveMenuItem[]> {
  const res = await apiClient.get<EffectiveMenuItem[]>(`/menu/branch/${branchId}/effective`);
  return res.data;
}

// ---- Orders ----

/**
 * Calls POST /orders — requires 'orders.create' permission. The response
 * shape isn't confirmed against a live sample (OrdersService.createOrder
 * return type wasn't shared), so this is typed loosely as unknown; adjust
 * once you confirm the actual response body.
 */
export async function createOrder(payload: CreateOrderPayload): Promise<unknown> {
  const res = await apiClient.post("/orders", payload);
  return res.data;
}

// Add alongside the other menu/order functions in api-client.ts
import type { Branch } from "./types"; // add to existing type imports

/**
 * Calls GET /branches — used to resolve branchIds (from the JWT) into
 * human-readable names for the branch picker. Requires whatever
 * permission the backend enforces on this route (likely branches.read or
 * similar — matches whatever apps/admin already relies on for the same
 * call, since staff logging into Mobile need at least read access to
 * their own assigned branches).
 */
export async function fetchBranches(): Promise<Branch[]> {
  const res = await apiClient.get<Branch[]>("/branches");
  return res.data;
}

export default apiClient;
