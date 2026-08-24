"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  permission?: string | string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Live Floor", href: "/dashboard/floor", permission: "orders.read" },
  { label: "Menu", href: "/dashboard/menu", permission: "menu.read" },
  { label: "Branches", href: "/dashboard/branches", permission: "branches.read" },
  { label: "Staff", href: "/dashboard/staff", permission: "staff.read" },
  { label: "Inventory", href: "/dashboard/inventory", permission: "inventory.read" },
  { label: "CRM", href: "/dashboard/crm", permission: "crm.read" },
  { label: "Reports", href: "/dashboard/reports", permission: "reports.read" },
  { label: "Expenses", href: "/dashboard/expenses", permission: "expenses.read" },
  { label: "Billing", href: "/dashboard/billing", permission: "billing.subscription.read" },
  { label: "Settings", href: "/dashboard/settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { hasAnyPermission } = usePermissions();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    const perms = Array.isArray(item.permission) ? item.permission : [item.permission];
    return hasAnyPermission(perms);
  });

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-slate-200 bg-white px-3 py-4">
      <div className="mb-3 px-2 text-sm font-semibold text-slate-900">Business OS</div>
      {visibleItems.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
