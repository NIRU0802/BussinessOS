// NEXT_PUBLIC_* env var injection is broken in this environment (both
// .env.local and next.config.ts env field failed to inject reliably under
// Turbopack). Hardcoding directly for local dev — change these two lines
// if your API port changes.
export const config = {
  apiUrl: "http://localhost:3001",
  socketUrl: "http://localhost:3001",
} as const;
