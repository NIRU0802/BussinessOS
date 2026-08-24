import apiClient from "../api-client";
import type { OrderChannel, OrderStatus, VoidRefundType } from "../enums";

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  modifiers: unknown | null;
  batchNumber: number;
  createdAt: string;
}

export interface OrderPayment {
  id: string;
  orderId: string;
  method: string;
  amount: string;
  status: "pending" | "completed" | "failed" | string;
  paidByCustomerRef: string | null;
  createdAt: string;
}

export interface VoidRefundRequest {
  id: string;
  orderId: string;
  type: VoidRefundType;
  requestedBy: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  tenantId: string;
  branchId: string;
  tableId: string | null;
  channel: OrderChannel;
  status: OrderStatus;
  subtotal: string;
  taxAmount: string;
  total: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payments: OrderPayment[];
  voidRefundRequests: VoidRefundRequest[];
}

export interface ListOrdersParams {
  branchId?: string;
  tableId?: string;
  channel?: OrderChannel;
  status?: OrderStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface ListOrdersResult {
  data: Order[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listOrders(params: ListOrdersParams): Promise<ListOrdersResult> {
  const res = await apiClient.get<ListOrdersResult>("/orders", { params });
  return res.data;
}

export async function getOrderById(orderId: string): Promise<Order> {
  const res = await apiClient.get<Order>(`/orders/${orderId}`);
  return res.data;
}

export async function approveVoidRefund(
  orderId: string,
  requestId: string,
  approve: boolean,
): Promise<Order> {
  const res = await apiClient.patch<Order>(
    `/orders/${orderId}/void-refund-requests/${requestId}/approve`,
    { approve },
  );
  return res.data;
}
