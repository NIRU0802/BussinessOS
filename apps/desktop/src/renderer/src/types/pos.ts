// ASSUMPTION: the exact response shape of GET /menu/branch/:branchId/effective
// (EffectiveMenuService.getForBranch) was not available when this was written.
// menuService.ts's own comment says the shape is "owned by apps/api
// EffectiveMenuItem — not re-declared here". The fields below are a
// best-effort guess based on standard menu-engine conventions. If the real
// response differs, only this file needs to change — every component below
// imports types from here, not from raw IPC results.
export interface MenuItem {
  id: string
  name: string
  categoryId: string
  categoryName: string
  price: string | number // decimal from server; normalize to number on read
  description?: string
  imageUrl?: string
  isAvailable?: boolean
  modifiers?: MenuModifierGroup[]
}

export interface MenuModifierGroup {
  id: string
  name: string
  required?: boolean
  multiSelect?: boolean
  options: MenuModifierOption[]
}

export interface MenuModifierOption {
  id: string
  name: string
  priceDelta: string | number
}

export interface MenuCategory {
  id: string
  name: string
  items: MenuItem[]
}

export interface CartLineModifier {
  groupId: string
  groupName: string
  optionId: string
  optionName: string
  priceDelta: number
}

export interface CartLine {
  lineId: string // client-side unique id (crypto.randomUUID()), not the product id
  productId: string
  name: string
  unitPrice: number
  quantity: number
  modifiers: CartLineModifier[]
  notes?: string
}

export interface CartTotals {
  subtotal: number
  taxAmount: number
  total: number
}

// Mirrors CreateOrderDto in apps/api/src/**/orders/dto/create-order.dto.ts
export interface CreateOrderItemPayload {
  productId: string
  quantity: number
  unitPrice: string
  modifiers?: Record<string, unknown>
}

export interface CreateOrderPayload {
  branchId: string
  tableId?: string
  deviceId: string
  clientGeneratedId: string
  channel: string // OrderChannel enum value, lowercase e.g. 'pos'
  items: CreateOrderItemPayload[]
  subtotal: string
  taxAmount: string
  total: string
}
