"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { extractApiErrorMessage } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ tenantSlug, email, password });
      router.push("/");
    } catch (err) {
      setError(extractApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ padding: 24, maxWidth: 360, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Business OS POS — Sign In</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="text"
          placeholder="Tenant slug"
          value={tenantSlug}
          onChange={(e) => setTenantSlug(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />
        {error && <p style={{ color: "#b91c1c", fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  fontSize: 14,
};

const buttonStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 8,
  border: "none",
  background: "#0f172a",
  color: "#ffffff",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};
