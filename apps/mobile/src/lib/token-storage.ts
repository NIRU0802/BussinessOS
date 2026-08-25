// Identical pattern to apps/admin/src/lib/token-storage.ts:
// - Access token: in-memory only (module-level singleton), never touches
//   localStorage — limits XSS exfiltration window, lost on hard reload.
// - Refresh token: localStorage, since this is a pure SPA with no BFF/
//   cookie proxy in front of it. Rotates on every use — callers MUST
//   persist the new refreshToken from every /auth/refresh response.

const REFRESH_TOKEN_KEY = "bos_mobile_refresh_token";
const TENANT_SLUG_KEY = "bos_mobile_tenant_slug";
const DEVICE_ID_KEY = "bos_mobile_device_id";

let inMemoryAccessToken: string | null = null;

export const tokenStorage = {
  getAccessToken(): string | null {
    return inMemoryAccessToken;
  },

  setAccessToken(token: string | null): void {
    inMemoryAccessToken = token;
  },

  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setRefreshToken(token: string | null): void {
    if (typeof window === "undefined") return;
    if (token) {
      window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },

  getTenantSlug(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TENANT_SLUG_KEY);
  },

  setTenantSlug(slug: string | null): void {
    if (typeof window === "undefined") return;
    if (slug) {
      window.localStorage.setItem(TENANT_SLUG_KEY, slug);
    } else {
      window.localStorage.removeItem(TENANT_SLUG_KEY);
    }
  },

  /**
   * Stable per-installation device identifier, sent as `deviceId` on every
   * order (required by CreateOrderDto). Generated once, persisted in
   * localStorage, and reused for the life of this browser install.
   */
  getOrCreateDeviceId(): string {
    if (typeof window === "undefined") return "ssr-placeholder";
    let id = window.localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  },

  clearAll(): void {
    inMemoryAccessToken = null;
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    // Tenant slug intentionally kept to pre-fill the login form next time.
  },
};
