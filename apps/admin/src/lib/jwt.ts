import type { JwtPayload } from "./types";

/**
 * Decodes a JWT payload WITHOUT verifying the signature. This is safe here
 * because the token only originates from our own trusted API responses
 * (login/refresh) — the frontend never trusts a token it didn't just
 * receive directly from the backend over TLS. Signature verification is
 * always enforced server-side on every subsequent API request.
 */
export function decodeJwtPayload(token: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed JWT");
  }

  const base64Url = parts[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

  const json =
    typeof window === "undefined"
      ? Buffer.from(padded, "base64").toString("utf-8")
      : decodeURIComponent(
          atob(padded)
            .split("")
            .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
            .join(""),
        );

  return JSON.parse(json) as JwtPayload;
}

export function isTokenExpired(payload: JwtPayload, skewSeconds = 10): boolean {
  const nowSeconds = Date.now() / 1000;
  return payload.exp - skewSeconds <= nowSeconds;
}
