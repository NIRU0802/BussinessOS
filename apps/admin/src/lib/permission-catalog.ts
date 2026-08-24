// Hardcoded mirror of apps/api/prisma/seed/seed.ts's PERMISSIONS array.
// There is currently no GET /permissions endpoint, so this list must be
// updated manually whenever a permission is added/removed on the backend.
// Recommend adding a real endpoint later so this can't drift silently.

export interface PermissionCatalogEntry {
  key: string;
  module: string;
  description: string;
}

export const PERMISSION_CATALOG: PermissionCatalogEntry[] = [
  { key: "orders.read", module: "orders", description: "View orders" },
  { key: "orders.write", module: "orders", description: "Create/update orders" },
  { key: "orders.void", module: "orders", description: "Void or refund orders" },
  { key: "orders.read.own", module: "orders", description: "View own orders (customer)" },
  { key: "menu.read", module: "menu", description: "View menu" },
  { key: "menu.write", module: "menu", description: "Edit menu items" },
  { key: "reports.read", module: "reports", description: "View reports" },
  {
    key: "reports.read_all_branches",
    module: "reports",
    description: "View combined multi-branch report rollups (Owner-level)",
  },
  { key: "staff.read", module: "staff", description: "View staff/roles" },
  { key: "staff.write", module: "staff", description: "Manage staff/roles" },
  { key: "branches.read", module: "branches", description: "View branches" },
  { key: "branches.write", module: "branches", description: "Manage branches" },
  { key: "crm.read", module: "crm", description: "View customers" },
  { key: "crm.write", module: "crm", description: "Manage customers" },
  { key: "kds.read", module: "kds", description: "View kitchen display" },
  { key: "kds.write", module: "kds", description: "Update kitchen order status" },
  { key: "inventory.read", module: "inventory", description: "View inventory" },
  { key: "inventory.write", module: "inventory", description: "Manage inventory" },
  {
    key: "inventory.adjust",
    module: "inventory",
    description: "Manually adjust stock levels (purchase/waste/correction)",
  },
  { key: "payments.read", module: "payments", description: "View payment records" },
  { key: "delivery.read", module: "delivery", description: "View delivery orders" },
  { key: "delivery.write", module: "delivery", description: "Update delivery status" },
  { key: "qr.order", module: "qr", description: "Place order via QR/table flow" },
  { key: "tables.read", module: "tables", description: "View tables" },
  { key: "tables.write", module: "tables", description: "Create/update/delete tables" },
  {
    key: "tables.manage",
    module: "tables",
    description: "Merge/split tables and manage QR codes",
  },
  { key: "reservations.read", module: "reservations", description: "View reservations" },
  {
    key: "reservations.write",
    module: "reservations",
    description: "Create/update reservations",
  },
  {
    key: "billing.plans.manage",
    module: "billing",
    description: "Manage subscription plans (platform admin)",
  },
  {
    key: "billing.subscription.read",
    module: "billing",
    description: "View tenant subscription details",
  },
  {
    key: "billing.subscription.manage",
    module: "billing",
    description: "Activate, change, or cancel tenant subscription",
  },
];

export function groupPermissionsByModule(): Record<string, PermissionCatalogEntry[]> {
  return PERMISSION_CATALOG.reduce<Record<string, PermissionCatalogEntry[]>>((acc, p) => {
    (acc[p.module] ??= []).push(p);
    return acc;
  }, {});
}
