import apiClient from "../api-client";

export interface PlanLimits {
  id: string;
  planId: string;
  maxBranches: number | null;
  maxUsers: number | null;
  maxDevices: number | null;
  maxStorageMb: number | null;
  maxMonthlyOrders: number | null;
}

export interface Plan {
  id: string;
  name: string;
  price: string;
  billingCycle: "monthly" | "yearly";
  description: string | null;
  providerPlanId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  limits: PlanLimits;
  widgets: { widgetKey: string }[];
}

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: "trialing" | "active" | "past_due" | "cancelled";
  renewalDate: string;
  startedAt: string;
  cancelledAt: string | null;
  provider: string | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
  plan: Plan;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  amount: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  subscriptionId: string;
  amount: string;
  status: "draft" | "issued" | "paid" | "void";
  issuedAt: string;
  paidAt: string | null;
  pdfObjectKey: string | null;
  pdfUrl: string | null;
  createdAt: string;
  items: InvoiceItem[];
}

export interface PaymentMethod {
  id: string;
  provider: string;
  isDefault: boolean;
  createdAt: string;
  maskedToken: string;
}

export async function getCurrentSubscription(): Promise<Subscription | null> {
  const res = await apiClient.get<Subscription | null>("/billing/subscription");
  return res.data ?? null;
}

export async function getInvoices(): Promise<Invoice[]> {
  const res = await apiClient.get<Invoice[]>("/billing/subscription/invoices");
  return res.data ?? [];
}

export async function getPaymentMethod(): Promise<PaymentMethod | null> {
  const res = await apiClient.get<PaymentMethod | null>("/billing/subscription/payment-method");
  return res.data ?? null;
}
