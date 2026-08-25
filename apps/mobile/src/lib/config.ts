// Same pattern as apps/admin/src/lib/config.ts — NEXT_PUBLIC_* env var
// injection is unreliable under Turbopack in this monorepo, so this is
// hardcoded for local dev. Change these two lines if your API port
// changes, or wire real env injection once that's fixed platform-wide.
export const config = {
  apiUrl: "http://localhost:3001",
  socketUrl: "http://localhost:3001",
} as const;
