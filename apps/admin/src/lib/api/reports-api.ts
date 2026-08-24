import apiClient from "../api-client";
import type { ReportPeriod } from "../enums";

export interface SalesSummaryPoint {
  periodStart: string;
  branchId: string | null;
  branchName: string | null;
  channel: string | null;
  orderCount: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  averageOrderValue: number;
}

export interface SalesSummaryResult {
  startDate: string;
  endDate: string;
  period: string;
  points: SalesSummaryPoint[];
  grandTotal: {
    orderCount: number;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    averageOrderValue: number;
  };
}

export interface SalesSummaryParams {
  startDate: string;
  endDate: string;
  period: ReportPeriod;
  branchIds?: string[];
  channel?: string;
  groupByChannel?: boolean;
  groupByBranch?: boolean;
}

export async function getSalesSummary(params: SalesSummaryParams): Promise<SalesSummaryResult> {
  const res = await apiClient.get<SalesSummaryResult>("/reports/sales-summary", {
    params: { ...params, branchIds: params.branchIds?.join(",") },
  });
  return res.data;
}

export function todayDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export function lastNDaysRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

// ---- Best Sellers ----

export type BestSellerSortBy = "quantity" | "revenue";

export interface BestSellerItem {
  menuItemId: string;
  itemName: string;
  branchId: string | null;
  branchName: string | null;
  quantitySold: number;
  revenue: number;
  orderCount: number;
}

export interface BestSellersParams {
  startDate: string;
  endDate: string;
  branchIds?: string[];
  limit?: number;
  sortBy?: BestSellerSortBy;
  groupByBranch?: boolean;
}

export async function getBestSellers(params: BestSellersParams): Promise<BestSellerItem[]> {
  const res = await apiClient.get<BestSellerItem[]>("/reports/best-sellers", {
    params: { ...params, branchIds: params.branchIds?.join(",") },
  });
  return res.data;
}

// ---- Branch Rollup ----

export interface BranchRollupBreakdown {
  branchId: string;
  branchName: string;
  orderCount: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  averageOrderValue: number;
}

export interface BranchRollupResult {
  startDate: string;
  endDate: string;
  combined: {
    orderCount: number;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    averageOrderValue: number;
  };
  branches: BranchRollupBreakdown[];
}

export interface BranchRollupParams {
  startDate: string;
  endDate: string;
  branchIds?: string[];
}

export async function getBranchRollup(params: BranchRollupParams): Promise<BranchRollupResult> {
  const res = await apiClient.get<BranchRollupResult>("/reports/branch-rollup", {
    params: { ...params, branchIds: params.branchIds?.join(",") },
  });
  return res.data;
}
