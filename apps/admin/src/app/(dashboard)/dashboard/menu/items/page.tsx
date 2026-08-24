"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";
import { ItemFormDialog } from "@/components/menu/item-form-dialog";
import { listCategories, listMenuItems, deleteMenuItem, type MenuItem } from "@/lib/api/menu-api";
import { formatCurrency } from "@/lib/utils";
import { extractApiErrorMessage } from "@/lib/api-client";

export default function MenuItemsPage() {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [deleting, setDeleting] = useState<MenuItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["menu-categories"],
    queryFn: listCategories,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["menu-items", categoryFilter],
    queryFn: () => listMenuItems(categoryFilter || undefined),
  });

  function refetch() {
    queryClient.invalidateQueries({ queryKey: ["menu-items"] });
  }

  async function handleDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await deleteMenuItem(deleting.id);
      toast.success("Item deleted");
      refetch();
      setDeleting(null);
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-56"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <PermissionGate permission="menu.write">
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            New Item
          </Button>
        </PermissionGate>
      </div>

      <Card>
        <CardContent>
          {isLoading ? (
            <SkeletonRows count={6} />
          ) : items.length === 0 ? (
            <EmptyState title="No items" description="Create a menu item to get started." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-10 w-10 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-slate-100" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {item.name}
                        {item.isVegetarian && (
                          <span className="ml-2 text-xs text-emerald-600">● Veg</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatCurrency(Number(item.basePrice), "INR")}
                        {!item.isActive && " · Inactive"}
                      </p>
                    </div>
                  </div>
                  <PermissionGate permission="menu.write">
                    <div className="flex gap-3">
                      <button
                        className="text-sm text-slate-600 hover:text-slate-900"
                        onClick={() => {
                          setEditing(item);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-sm text-red-600 hover:text-red-800"
                        onClick={() => setDeleting(item)}
                      >
                        Delete
                      </button>
                    </div>
                  </PermissionGate>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ItemFormDialog
        open={formOpen}
        item={editing}
        categories={categories}
        onClose={() => setFormOpen(false)}
        onSaved={refetch}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete item?"
        description={`This will remove "${deleting?.name}" from the menu.`}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
