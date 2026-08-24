import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { Expense } from "@/lib/api/expenses-api";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface ExpenseListTableProps {
  expenses: Expense[] | undefined;
  isLoading: boolean;
  onDelete: (id: string) => void;
}

function ExpenseRow({ expense, onDelete }: { expense: Expense; onDelete: (id: string) => void }) {
  const amountLabel = "Rs " + Number(expense.amount).toLocaleString("en-IN");

  return (
    <tr className="border-b border-slate-50 last:border-0">
      <td className="py-2.5 text-slate-900">{formatDate(expense.expenseDate)}</td>
      <td className="py-2.5 text-slate-600">{expense.category.name}</td>
      <td className="py-2.5 text-slate-600">{expense.branch.name}</td>
      <td className="py-2.5 text-slate-600">{expense.description ?? "-"}</td>
      <td className="py-2.5 font-medium text-slate-900">{amountLabel}</td>
      <td className="py-2.5 text-right">
        {expense.receiptUrl && (
          <a
            href={expense.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mr-3 text-sm text-slate-500 underline underline-offset-2 hover:text-slate-700"
          >
            Receipt
          </a>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(expense.id)}>
          Delete
        </Button>
      </td>
    </tr>
  );
}

export function ExpenseListTable({ expenses, isLoading, onDelete }: ExpenseListTableProps) {
  const hasExpenses = !isLoading && expenses && expenses.length > 0;
  const isEmpty = !isLoading && (!expenses || expenses.length === 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <SkeletonRows count={5} />}
        {isEmpty && (
          <EmptyState
            title="No expenses yet"
            description="Add your first expense to start tracking."
          />
        )}
        {hasExpenses && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium">Branch</th>
                <th className="pb-2 font-medium">Description</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {expenses!.map((expense) => (
                <ExpenseRow key={expense.id} expense={expense} onDelete={onDelete} />
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
