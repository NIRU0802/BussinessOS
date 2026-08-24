import { cn } from "@/lib/utils";
import { TABLE_STATUS_COLORS, TABLE_STATUS_LABELS } from "@/lib/enums";
import type { RestaurantTable } from "@/lib/api/tables-api";

interface TableCardProps {
  table: RestaurantTable;
  onClick: () => void;
}

export function TableCard({ table, onClick }: TableCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start rounded-lg border p-4 text-left transition-shadow hover:shadow-md",
        TABLE_STATUS_COLORS[table.status],
      )}
    >
      <span className="text-sm font-semibold">{table.label}</span>
      <span className="mt-1 text-xs opacity-80">{TABLE_STATUS_LABELS[table.status]}</span>
      <span className="mt-2 text-xs opacity-70">Seats {table.capacity}</span>
    </button>
  );
}
