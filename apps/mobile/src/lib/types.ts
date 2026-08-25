// Mirrors apps/admin/src/lib/types.ts — keep in sync when auth/RBAC/branch
// shapes change on the backend.
// apps/admin/src/lib/types.ts
export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  timezone: string;
  currencyCode: string;
  isActive: boolean;
}

export interface JwtPayload {
  sub: string;
  tenantId: string;
  branchIds: string[];
  isAllBranches: boolean;
  roles: string[];
  permissions: string[];
  exp: number;
  iat: number;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  tenantSlug: string;
  email: string;
  password: string;
}

export interface LoginResponse extends TokenPair {
  user: AuthUser;
  tenant: AuthTenant;
}

export interface RefreshResponse extends TokenPair {}

export interface SessionState {
  userId: string;
  tenantId: string;
  branchIds: string[];
  isAllBranches: boolean;
  roles: string[];
  permissions: string[];
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

// ---- Menu (mirrors EffectiveMenuItem from apps/api effective-menu.service.ts) ----

export interface MenuItemVariant {
  id: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
}

export interface MenuItemModifierOption {
  id: string;
  name: string;
  priceDelta: number;
}

export interface MenuItemModifierGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  isRequired: boolean;
  options: MenuItemModifierOption[];
}

export interface EffectiveMenuItem {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  effectivePrice: number;
  isAvailable: boolean;
  isVegetarian: boolean;
  imageUrl: string | null;
  variants: MenuItemVariant[];
  modifierGroups: MenuItemModifierGroup[];
}

// ---- Orders (mirrors CreateOrderDto from apps/api) ----

export type OrderChannel = "pos" | "qr" | "delivery_zomato" | "delivery_swiggy" | "whatsapp";

export interface CreateOrderItemPayload {
  productId: string;
  quantity: number;
  unitPrice: string; // decimal as string, matches backend expectation
  modifiers?: Record<string, unknown>;
}

export interface CreateOrderPayload {
  branchId: string;
  tableId?: string;
  deviceId: string;
  clientGeneratedId: string;
  channel: OrderChannel;
  items: CreateOrderItemPayload[];
  subtotal: string;
  taxAmount: string;
  total: string;
}
