"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken, setRefreshToken, setAdmin, ApiError } from "@/lib/api-client";

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  admin: {
    id: string;
    email: string;
    fullName: string;
    adminType: "GR8" | "TEAM";
  };
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post<LoginResponse>("/super-admin/auth/login", {
        email,
        password,
      });

      setToken(res.accessToken);
      setRefreshToken(res.refreshToken);
      setAdmin(res.admin);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-2xl">
            {"\u{1F6E1}\uFE0F"}
          </div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Business OS</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Super Admin Portal</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-6 shadow-xl"
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                placeholder="********"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[var(--accent)] px-3 py-2.5 text-sm font-medium text-[#0a0e14] transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--muted)]">
          Platform operators only. This is not the tenant Owner Dashboard.
        </p>
      </div>
    </div>
  );
}
