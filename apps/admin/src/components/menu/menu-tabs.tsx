"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Categories", href: "/dashboard/menu/categories" },
  { label: "Items", href: "/dashboard/menu/items" },
  { label: "Modifier Groups", href: "/dashboard/menu/modifiers" },
  { label: "Combos", href: "/dashboard/menu/combos" },
  { label: "Branch Overrides", href: "/dashboard/menu/overrides" },
];

export function MenuTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-slate-200">
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium",
              isActive
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
