export interface SalesSummaryPoint {
  periodStart: string; // ISO date string, start of the bucket
  branchId: string | null; // null when aggregated across all branches
  branchName: string | null;
  channel: string | null; // null when aggregated across all channels
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

export interface BestSellerItem {
  menuItemId: string;
  itemName: string;
  branchId: string | null;
  branchName: string | null;
  quantitySold: number;
  revenue: number;
  orderCount: number;
}

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
