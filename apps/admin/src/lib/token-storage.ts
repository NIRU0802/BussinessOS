// Access token: kept in memory only (module-level singleton). This limits
// the window an XSS payload has to exfiltrate a usable long-lived token —
// it never touches localStorage/sessionStorage and is lost on hard reload.
//
// Refresh token: must survive reloads, so it lives in localStorage. This is
// a pragmatic tradeoff for a pure SPA with no BFF/cookie proxy in front of
// it yet. If a Next.js API-route or edge proxy is added later, migrate this
// to an httpOnly cookie set by that proxy instead.
//
// Refresh tokens rotate on every use (backend enforces reuse-detection via
// token families) — callers MUST persist the new refreshToken from every
// /auth/refresh response and discard the old one immediately.

const REFRESH_TOKEN_KEY = "bos_refresh_token";
const TENANT_SLUG_KEY = "bos_tenant_slug";

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

  clearAll(): void {
    inMemoryAccessToken = null;
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    // Tenant slug is intentionally kept so the login form can pre-fill it
    // for the user's next sign-in.
  },
};
