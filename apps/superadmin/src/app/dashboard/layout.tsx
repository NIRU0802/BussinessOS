"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthGuard } from "@/lib/use-auth-guard";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: "📊", requiresGr8: false },
  { href: "/dashboard/tenants", label: "Tenants", icon: "🏢", requiresGr8: false },
  { href: "/dashboard/plans", label: "Plans", icon: "💳", requiresGr8: false },
  { href: "/dashboard/widgets", label: "Widgets", icon: "🧩", requiresGr8: false },
  { href: "/dashboard/feature-flags", label: "Feature Flags", icon: "🚩", requiresGr8: false },
  { href: "/dashboard/monitoring", label: "Monitoring", icon: "🩺", requiresGr8: false },
  { href: "/dashboard/customers", label: "Customer Data", icon: "👥", requiresGr8: true },
  { href: "/dashboard/onboarding", label: "Onboard Business", icon: "\u2795", requiresGr8: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { admin, checked, logout } = useAuthGuard();
  const pathname = usePathname();

  if (!checked || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-sm text-[var(--muted)]">Loading...</div>
      </div>
    );
  }

  // Team Superadmins should not even see a nav link to screens they're
  // blocked from at the API level — currently all nav items are tier-agnostic
  // at the list/status level, since GR8-only restriction happens deeper
  // (e.g. inside the tenant detail's "business content" tab).
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.requiresGr8 || admin.adminType === "GR8",
  );

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <aside className="flex w-60 flex-col border-r border-[var(--panel-border)] bg-[var(--panel)]">
        <div className="border-b border-[var(--panel-border)] px-5 py-5">
          <div className="text-sm font-semibold text-[var(--foreground)]">Business OS</div>
          <div className="text-xs text-[var(--muted)]">Super Admin</div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--foreground)]"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--panel-border)] px-3 py-4">
          <div className="mb-3 px-3">
            <div className="truncate text-xs font-medium text-[var(--foreground)]">
              {admin.fullName}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                  admin.adminType === "GR8"
                    ? "bg-[var(--danger)]/15 text-[var(--danger)]"
                    : "bg-[var(--accent)]/15 text-[var(--accent)]"
                }`}
              >
                {admin.adminType}
              </span>
              <span className="truncate">{admin.email}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--foreground)]"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
