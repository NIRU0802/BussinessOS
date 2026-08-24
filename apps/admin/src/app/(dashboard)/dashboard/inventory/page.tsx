"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";
import { InventoryItemFormDialog } from "@/components/inventory/inventory-item-form-dialog";
import { StockAdjustmentDialog } from "@/components/inventory/stock-adjustment-dialog";
import { ThresholdDialog } from "@/components/inventory/threshold-dialog";
import {
  listInventoryItems,
  listStockForBranch,
  getLowStockSummary,
  deleteInventoryItem,
  type InventoryItem,
} from "@/lib/api/inventory-api";
import { extractApiErrorMessage } from "@/lib/api-client";

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const { activeBranchId, session } = useAuth();
  const effectiveBranchId = activeBranchId ?? session?.branchIds[0] ?? null;

  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [thresholdItem, setThresholdItem] = useState<InventoryItem | null>(null);

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["inventory-items"],
    queryFn: () => listInventoryItems(),
  });

  const { data: stockLevels = [] } = useQuery({
    queryKey: ["stock-levels", effectiveBranchId],
    queryFn: () => listStockForBranch(effectiveBranchId!),
    enabled: !!effectiveBranchId,
  });

  const { data: lowStock = [] } = useQuery({
    queryKey: ["low-stock", effectiveBranchId],
    queryFn: () => getLowStockSummary(effectiveBranchId ?? undefined),
  });

  function refetch() {
    queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
    queryClient.invalidateQueries({ queryKey: ["stock-levels", effectiveBranchId] });
    queryClient.invalidateQueries({ queryKey: ["low-stock", effectiveBranchId] });
  }

  async function handleDeleteItem() {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      await deleteInventoryItem(deletingItem.id);
      toast.success("Item deleted");
      refetch();
      setDeletingItem(null);
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  }

  const lowStockIds = new Set(lowStock.map((l) => l.inventoryItemId));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500">
            Manage ingredients, stock levels, and thresholds.
          </p>
        </div>
        <PermissionGate permission="inventory.write">
          <Button
            onClick={() => {
              setEditingItem(null);
              setItemFormOpen(true);
            }}
          >
            New Item
          </Button>
        </PermissionGate>
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900">
            {lowStock.length} item{lowStock.length === 1 ? "" : "s"} below threshold at this branch
          </p>
        </div>
      )}

      <Card>
        <CardContent>
          {itemsLoading ? (
            <SkeletonRows count={6} />
          ) : items.length === 0 ? (
            <EmptyState
              title="No inventory items"
              description="Add ingredients to start tracking stock."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((item) => {
                const stockLevel = stockLevels.find((s) => s.inventoryItemId === item.id);
                const isLow = lowStockIds.has(item.id);
                return (
                  <li key={item.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {item.name}
                        {isLow && <span className="ml-2 text-xs text-amber-600">● Low stock</span>}
                      </p>
                      <p className="text-xs text-slate-500">
                        {stockLevel
                          ? `${stockLevel.currentQuantity} ${item.unit} in stock (threshold ${stockLevel.lowStockThreshold})`
                          : `No stock record for this branch yet`}
                      </p>
                    </div>
                    <PermissionGate permission="inventory.adjust">
                      <div className="flex gap-3">
                        <button
                          className="text-sm text-slate-600 hover:text-slate-900"
                          onClick={() => setAdjustingItem(item)}
                        >
                          Adjust
                        </button>
                        <button
                          className="text-sm text-slate-600 hover:text-slate-900"
                          onClick={() => setThresholdItem(item)}
                        >
                          Threshold
                        </button>
                        <PermissionGate permission="inventory.write">
                          <button
                            className="text-sm text-slate-600 hover:text-slate-900"
                            onClick={() => {
                              setEditingItem(item);
                              setItemFormOpen(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="text-sm text-red-600 hover:text-red-800"
                            onClick={() => setDeletingItem(item)}
                          >
                            Delete
                          </button>
                        </PermissionGate>
                      </div>
                    </PermissionGate>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <InventoryItemFormDialog
        open={itemFormOpen}
        item={editingItem}
        onClose={() => setItemFormOpen(false)}
        onSaved={refetch}
      />

      {effectiveBranchId && (
        <>
          <StockAdjustmentDialog
            open={!!adjustingItem}
            branchId={effectiveBranchId}
            item={adjustingItem}
            onClose={() => setAdjustingItem(null)}
            onSaved={refetch}
          />
          <ThresholdDialog
            open={!!thresholdItem}
            branchId={effectiveBranchId}
            item={thresholdItem}
            currentThreshold={
              stockLevels.find((s) => s.inventoryItemId === thresholdItem?.id)?.lowStockThreshold
            }
            onClose={() => setThresholdItem(null)}
            onSaved={refetch}
          />
        </>
      )}

      <ConfirmDialog
        open={!!deletingItem}
        title="Delete inventory item?"
        description={`This will remove "${deletingItem?.name}" from the catalog.`}
        isLoading={isDeleting}
        onConfirm={handleDeleteItem}
        onCancel={() => setDeletingItem(null)}
      />
    </div>
  );
}
