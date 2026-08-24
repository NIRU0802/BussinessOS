// Mirrors apps/api/prisma/schema.prisma enums. Keep in sync.

export type TableStatus = "available" | "occupied" | "preparing" | "bill_requested" | "paid";

export const TABLE_STATUS_LABELS: Record<TableStatus, string> = {
  available: "Available",
  occupied: "Occupied",
  preparing: "Preparing",
  bill_requested: "Bill Requested",
  paid: "Paid",
};

export const TABLE_STATUS_COLORS: Record<TableStatus, string> = {
  available: "bg-emerald-100 text-emerald-800 border-emerald-300",
  occupied: "bg-amber-100 text-amber-800 border-amber-300",
  preparing: "bg-blue-100 text-blue-800 border-blue-300",
  bill_requested: "bg-purple-100 text-purple-800 border-purple-300",
  paid: "bg-slate-100 text-slate-600 border-slate-300",
};

export type OrderStatus = "open" | "held" | "paid" | "voided" | "refunded" | "cancelled";

export type OrderChannel =
  "pos" | "qr" | "delivery_zomato" | "delivery_swiggy" | "delivery_ubereats" | "whatsapp" | "phone";

export type PaymentMethod = "cash" | "card" | "upi" | "other";

export type VoidRefundType = "void" | "refund";
export type VoidRefundStatus = "pending" | "approved" | "rejected";

export type ReportPeriod = "day" | "week" | "month";
