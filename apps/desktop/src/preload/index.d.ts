import { ElectronAPI } from '@electron-toolkit/preload'

export interface DeviceConfig {
  tenantId: string
  tenantSlug: string
  branchId: string
  apiBaseUrl: string
}

export interface LoginResult {
  success: boolean
  mode?: 'online'
  accessToken?: string
  refreshToken?: string
  user?: { id: string; firstName: string; lastName: string; email: string; roles: string[] }
  error?: string
}

export interface QuickLoginResult {
  success: boolean
  mode?: 'online' | 'offline'
  accessToken?: string
  user?: { id: string; firstName: string; lastName: string; roles: string[] }
  error?: string
}

export interface MenuFetchResult {
  success: boolean
  items?: unknown[]
  error?: string
}

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
  channel: string
  items: CreateOrderItemPayload[]
  subtotal: string
  taxAmount: string
  total: string
}

export interface CreateOrderResult {
  success: boolean
  order?: unknown
  queued?: boolean
  error?: string
}

export interface SplitPaymentSharePayload {
  method: 'cash' | 'card' | 'upi' | 'other'
  itemIds?: string[]
  amount?: string
  paidByCustomerRef?: string
}

export interface SplitBillPayload {
  mode: 'by_item' | 'equal_share'
  shares: SplitPaymentSharePayload[]
}

export interface SplitBillResult {
  success: boolean
  order?: unknown
  error?: string
}

export type OutboxStatus = 'pending' | 'syncing' | 'synced' | 'failed'

export interface OutboxOrderRow {
  clientGeneratedId: string
  payload: CreateOrderPayload
  status: OutboxStatus
  attemptCount: number
  lastAttemptAt: string | null
  errorMessage: string | null
  serverOrderId: string | null
  createdAt: string
}

export interface RunOutboxSyncResult {
  synced: number
  failed: number
  stillPending: number
}

export type TableStatus = 'available' | 'occupied' | 'preparing' | 'bill_requested' | 'paid'

export interface Table {
  id: string
  tenantId: string
  branchId: string
  label: string
  capacity: number
  status: TableStatus
  mergedIntoTableId: string | null
  isActive: boolean
}

export interface TableFetchResult {
  success: boolean
  tables?: Table[]
  error?: string
}

export interface OrderItemRecord {
  id: string
  productId: string
  quantity: number
  unitPrice: string
  modifiers: Record<string, unknown> | null
  batchNumber: number
}

export interface OrderRecord {
  id: string
  tableId: string | null
  status: string
  subtotal: string
  taxAmount: string
  total: string
  items: OrderItemRecord[]
}

export interface GetOpenOrderResult {
  success: boolean
  order?: OrderRecord | null
  error?: string
}

export interface AddOrderItemsResult {
  success: boolean
  order?: OrderRecord
  error?: string
}

export interface Branding {
  businessName: string | null
  logoUrl: string | null
  primaryColor: string
  primaryColorDark: string
  inkColor: string
  surfaceColor: string
  fontDisplay: string
}
export interface Api {
  device: {
    getConfig: () => Promise<DeviceConfig | null>
    isConfigured: () => Promise<boolean>
    setConfig: (config: DeviceConfig) => Promise<void>
    getDeviceId: () => Promise<string>
  }
  staff: {
    getList: () => Promise<StaffListResult>
  }
  auth: {
    login: (email: string, password: string) => Promise<LoginResult>
    quickLogin: (userId: string, pin: string) => Promise<QuickLoginResult>
  }
  menu: {
    getEffective: (branchId: string) => Promise<MenuFetchResult>
  }
  orders: {
    create: (payload: CreateOrderPayload) => Promise<CreateOrderResult>
    splitBill: (orderId: string, payload: SplitBillPayload) => Promise<SplitBillResult>
    getOpenForTable: (branchId: string, tableId: string) => Promise<GetOpenOrderResult>
    addItems: (orderId: string, items: CreateOrderItemPayload[]) => Promise<AddOrderItemsResult>
  }
  sync: {
    runOutboxSync: () => Promise<RunOutboxSyncResult>
    isQueueEmpty: () => Promise<boolean>
    getOutboxHistory: () => Promise<OutboxOrderRow[]>
    notifyOnline: () => void
  }
  tables: {
    getForBranch: (branchId: string) => Promise<TableFetchResult>
  }
  branding: {
    get: () => Promise<Branding>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
