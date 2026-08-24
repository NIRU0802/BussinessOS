"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";
import { CategoryFormDialog } from "@/components/menu/category-form-dialog";
import { listCategories, deleteCategory, type MenuCategory } from "@/lib/api/menu-api";
import { extractApiErrorMessage } from "@/lib/api-client";

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MenuCategory | null>(null);
  const [deleting, setDeleting] = useState<MenuCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["menu-categories"],
    queryFn: listCategories,
  });

  function refetch() {
    queryClient.invalidateQueries({ queryKey: ["menu-categories"] });
  }

  async function handleDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await deleteCategory(deleting.id);
      toast.success("Category deleted");
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
      <div className="flex justify-end">
        <PermissionGate permission="menu.write">
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            New Category
          </Button>
        </PermissionGate>
      </div>

      <Card>
        <CardContent>
          {isLoading ? (
            <SkeletonRows count={5} />
          ) : categories.length === 0 ? (
            <EmptyState title="No categories yet" description="Create your first menu category." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {categories
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((cat) => (
                  <li key={cat.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{cat.name}</p>
                      {cat.description && (
                        <p className="text-xs text-slate-500">{cat.description}</p>
                      )}
                    </div>
                    <PermissionGate permission="menu.write">
                      <div className="flex gap-3">
                        <button
                          className="text-sm text-slate-600 hover:text-slate-900"
                          onClick={() => {
                            setEditing(cat);
                            setFormOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="text-sm text-red-600 hover:text-red-800"
                          onClick={() => setDeleting(cat)}
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

      <CategoryFormDialog
        open={formOpen}
        category={editing}
        onClose={() => setFormOpen(false)}
        onSaved={refetch}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete category?"
        description={`This will remove "${deleting?.name}". Items in this category may be affected.`}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
