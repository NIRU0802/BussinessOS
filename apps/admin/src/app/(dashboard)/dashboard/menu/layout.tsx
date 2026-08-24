import { MenuTabs } from "@/components/menu/menu-tabs";

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Menu & Catalog</h1>
        <p className="text-sm text-slate-500">Manage categories, items, modifiers, and combos.</p>
      </div>
      <MenuTabs />
      <div>{children}</div>
    </div>
  );
}
