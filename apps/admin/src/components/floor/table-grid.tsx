import { TableCard } from "./table-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRows } from "@/components/ui/skeleton";
import type { RestaurantTable } from "@/lib/api/tables-api";

interface TableGridProps {
  tables: RestaurantTable[];
  isLoading: boolean;
  onSelectTable: (table: RestaurantTable) => void;
}

export function TableGrid({ tables, isLoading, onSelectTable }: TableGridProps) {
  if (isLoading) return <SkeletonRows count={6} />;

  if (tables.length === 0) {
    return (
      <EmptyState
        title="No tables set up"
        description="Add tables for this branch under Branch Management."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {tables.map((table) => (
        <TableCard key={table.id} table={table} onClick={() => onSelectTable(table)} />
      ))}
    </div>
  );
}
