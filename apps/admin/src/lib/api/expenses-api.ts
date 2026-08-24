import apiClient from "../api-client";

export interface ExpenseCategory {
  id: string;
  tenantId: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  tenantId: string;
  branchId: string;
  categoryId: string;
  amount: string;
  description: string | null;
  expenseDate: string;
  receiptObjectKey: string | null;
  receiptUrl: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  category: ExpenseCategory;
  branch: { id: string; name: string };
}

export interface ExpensesPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ExpensesListResult {
  items: Expense[];
  pagination: ExpensesPagination;
}

export interface QueryExpensesParams {
  branchId?: string;
  categoryId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateExpenseInput {
  branchId: string;
  categoryId: string;
  amount: number;
  description?: string;
  expenseDate: string;
  receipt?: File;
}

export interface CreateExpenseCategoryInput {
  name: string;
}

export async function listExpenseCategories(): Promise<ExpenseCategory[]> {
  const res = await apiClient.get<ExpenseCategory[]>("/expense-categories");
  return res.data;
}

export async function createExpenseCategory(
  input: CreateExpenseCategoryInput,
): Promise<ExpenseCategory> {
  const res = await apiClient.post<ExpenseCategory>("/expense-categories", input);
  return res.data;
}

export async function listExpenses(params: QueryExpensesParams): Promise<ExpensesListResult> {
  const res = await apiClient.get<ExpensesListResult>("/expenses", { params });
  return res.data;
}

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  const formData = new FormData();
  formData.append("branchId", input.branchId);
  formData.append("categoryId", input.categoryId);
  formData.append("amount", String(input.amount));
  formData.append("expenseDate", input.expenseDate);
  if (input.description) formData.append("description", input.description);
  if (input.receipt) formData.append("receipt", input.receipt);

  const res = await apiClient.post<Expense>("/expenses", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function deleteExpense(id: string): Promise<void> {
  await apiClient.delete(`/expenses/${id}`);
}

// ---- P&L Report ----

export interface PnlCategoryBreakdown {
  categoryId: string;
  categoryName: string;
  total: number;
}

export interface PnlResult {
  period: { fromDate: string; toDate: string };
  scope: { branchId?: string; tenantWide?: boolean };
  revenue: { total: number; paidOrderCount: number };
  expenses: { total: number; byCategory: PnlCategoryBreakdown[] };
  netProfit: number;
}

export interface PnlQueryParams {
  fromDate: string;
  toDate: string;
  branchId?: string;
}

export async function getProfitAndLoss(params: PnlQueryParams): Promise<PnlResult> {
  const res = await apiClient.get<PnlResult>("/reports/profit-and-loss", { params });
  return res.data;
}
