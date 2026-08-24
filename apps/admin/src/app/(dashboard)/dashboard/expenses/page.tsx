"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { extractApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ExpenseListTable } from "@/components/expenses/expense-list-table";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import { PnlView } from "@/components/expenses/pnl-view";
import { ReportFilters } from "@/components/reports/report-filters";
import { lastNDaysRange } from "@/lib/api/reports-api";
import { listBranches } from "@/lib/api/branches-api";
import {
  listExpenses,
  listExpenseCategories,
  deleteExpense,
  getProfitAndLoss,
} from "@/lib/api/expenses-api";

export default function ExpensesPage() {
  const { activeBranchId } = useAuth();
  const queryClient = useQueryClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const defaultRange = lastNDaysRange(30);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);

  const branchesQuery = useQuery({
    queryKey: ["branches-for-expenses"],
    queryFn: listBranches,
  });

  const categoriesQuery = useQuery({
    queryKey: ["expense-categories"],
    queryFn: listExpenseCategories,
  });

  const expensesQuery = useQuery({
    queryKey: ["expenses", startDate, endDate, activeBranchId],
    queryFn: () =>
      listExpenses({
        branchId: activeBranchId ?? undefined,
        fromDate: startDate.slice(0, 10),
        toDate: endDate.slice(0, 10),
      }),
  });

  const pnlQuery = useQuery({
    queryKey: ["expenses-pnl", startDate, endDate, activeBranchId],
    queryFn: () =>
      getProfitAndLoss({
        fromDate: startDate.slice(0, 10),
        toDate: endDate.slice(0, 10),
        branchId: activeBranchId ?? undefined,
      }),
  });

  function refetchAll() {
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    queryClient.invalidateQueries({ queryKey: ["expenses-pnl"] });
  }

  async function handleConfirmDelete() {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await deleteExpense(deleteTargetId);
      toast.success("Expense deleted");
      refetchAll();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsDeleting(false);
      setDeleteTargetId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Expenses</h1>
          <p className="text-sm text-slate-500">Track expenses and view profit &amp; loss.</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>Add Expense</Button>
      </div>

      <ReportFilters
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        showPeriod={false}
      />

      <PnlView data={pnlQuery.data} isLoading={pnlQuery.isLoading} />

      <ExpenseListTable
        expenses={expensesQuery.data?.items}
        isLoading={expensesQuery.isLoading}
        onDelete={setDeleteTargetId}
      />

      <ExpenseFormDialog
        open={isFormOpen}
        branches={branchesQuery.data ?? []}
        categories={categoriesQuery.data ?? []}
        defaultBranchId={activeBranchId}
        onClose={() => setIsFormOpen(false)}
        onSaved={refetchAll}
      />

      <ConfirmDialog
        open={!!deleteTargetId}
        title="Delete expense?"
        description="This will permanently remove this expense record."
        confirmLabel="Delete"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
