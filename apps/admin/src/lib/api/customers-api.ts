import apiClient from "../api-client";

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  email: string | null;
  dob: string | null;
  notes: string | null;
  preferences: Record<string, unknown> | null;
  totalOrders: number;
  totalSpent: string;
  lastOrderAt: string | null;
  createdAt: string;
}

export interface CreateCustomerInput {
  name: string;
  phone: string;
  email?: string;
  dob?: string;
  notes?: string;
  preferences?: Record<string, unknown>;
}

export interface QueryCustomersParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface ListCustomersResult {
  items: Customer[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listCustomers(params: QueryCustomersParams): Promise<ListCustomersResult> {
  const res = await apiClient.get<ListCustomersResult>("/customers", { params });
  return res.data;
}

export async function getCustomer(id: string): Promise<Customer> {
  const res = await apiClient.get<Customer>(`/customers/${id}`);
  return res.data;
}

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const res = await apiClient.post<Customer>("/customers", input);
  return res.data;
}

export async function updateCustomer(
  id: string,
  input: Partial<CreateCustomerInput>,
): Promise<Customer> {
  const res = await apiClient.patch<Customer>(`/customers/${id}`, input);
  return res.data;
}

export async function deleteCustomer(id: string): Promise<void> {
  await apiClient.delete(`/customers/${id}`);
}

export interface CustomerAddress {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
}

export interface CreateCustomerAddressInput {
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export async function addCustomerAddress(
  customerId: string,
  input: CreateCustomerAddressInput,
): Promise<CustomerAddress> {
  const res = await apiClient.post<CustomerAddress>(`/customers/${customerId}/addresses`, input);
  return res.data;
}

export async function removeCustomerAddress(customerId: string, addressId: string): Promise<void> {
  await apiClient.delete(`/customers/${customerId}/addresses/${addressId}`);
}

export interface Customer360Response {
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    dob: string | null;
    notes: string | null;
    preferences: unknown;
    createdAt: string;
  };
  addresses: Array<{
    id: string;
    label: string;
    line1: string;
    line2: string | null;
    city: string;
    isDefault: boolean;
  }>;
  orderStats: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    firstOrderAt: string | null;
    lastOrderAt: string | null;
  };
  channelBreakdown: Array<{ channel: string; orderCount: number }>;
  branchBreakdown: Array<{ branchId: string; orderCount: number }>;
  recentOrders: Array<{
    id: string;
    branchId: string;
    channel: string;
    status: string;
    total: number;
    createdAt: string;
  }>;
}

export async function getCustomer360(id: string): Promise<Customer360Response> {
  const res = await apiClient.get<Customer360Response>(`/customers/${id}/360`);
  return res.data;
}

export interface PrepareBirthdayMessageResult {
  customerId: string;
  customerName: string;
  customerPhone: string;
  message: string;
  whatsappDeepLink: string;
}

export async function prepareBirthdayMessage(
  customerId: string,
  customMessage?: string,
): Promise<PrepareBirthdayMessageResult> {
  const res = await apiClient.post<PrepareBirthdayMessageResult>(
    `/customers/${customerId}/prepare-birthday-message`,
    customMessage ? { customMessage } : {},
  );
  return res.data;
}
