import log from 'electron-log'
import { getDeviceConfig } from '../database/deviceConfig'
import { requireOnlineSession } from './sessionStore'

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
  error?: string
  errorKind?: 'network' | 'rejected' | 'not_configured' | 'not_authenticated'
}

export async function createOrder(payload: CreateOrderPayload): Promise<CreateOrderResult> {
  const config = getDeviceConfig()
  if (!config) {
    return {
      success: false,
      error: 'Device is not set up. Contact your administrator.',
      errorKind: 'not_configured'
    }
  }

  let session
  try {
    session = requireOnlineSession()
  } catch (err) {
    return { success: false, error: (err as Error).message, errorKind: 'not_authenticated' }
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (!response.ok) {
      // A real rejection from the server (validation error, permission
      // denied, etc.) — the request reached the server and got a definite
      // answer. Retrying this exact payload will fail again, so this must
      // NOT be queued to the outbox.
      return {
        success: false,
        error: data?.message ?? 'Failed to create order.',
        errorKind: 'rejected'
      }
    }

    return { success: true, order: data }
  } catch (err) {
    // fetch() throwing means the request never reached the server
    // (offline, DNS failure, timeout, connection refused). This is the
    // only case safe to queue for retry.
    log.error('[orders] Failed to create order (network):', err)
    return {
      success: false,
      error: 'Could not reach the server. Check your internet connection.',
      errorKind: 'network'
    }
  }
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

export async function splitBill(
  orderId: string,
  payload: SplitBillPayload
): Promise<SplitBillResult> {
  const config = getDeviceConfig()
  if (!config) {
    return { success: false, error: 'Device is not set up. Contact your administrator.' }
  }

  let session
  try {
    session = requireOnlineSession()
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}/orders/${orderId}/split-bill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data?.message ?? 'Failed to record payment.' }
    }

    return { success: true, order: data }
  } catch (err) {
    log.error('[orders] Failed to record payment:', err)
    return { success: false, error: 'Could not reach the server. Check your internet connection.' }
  }
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

export async function getOpenOrderForTable(
  branchId: string,
  tableId: string
): Promise<GetOpenOrderResult> {
  const config = getDeviceConfig()
  if (!config) {
    return { success: false, error: 'Device is not set up. Contact your administrator.' }
  }

  let session
  try {
    session = requireOnlineSession()
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }

  try {
    const params = new URLSearchParams({ branchId, tableId, status: 'open', pageSize: '1' })
    const response = await fetch(`${config.apiBaseUrl}/orders?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`
      }
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data?.message ?? 'Failed to load table order.' }
    }

    // listOrders on the server returns { data, total, page, pageSize, totalPages },
    // not a bare array — unwrap and take the single match (pageSize=1, status=open
    // means at most one row per table, per assertNoActiveOrderForTable).
    const order = (data?.data?.[0] as OrderRecord | undefined) ?? null
    return { success: true, order }
  } catch (err) {
    log.error('[orders] Failed to fetch open order for table:', err)
    return { success: false, error: 'Could not reach the server. Check your internet connection.' }
  }
}

export interface AddOrderItemsResult {
  success: boolean
  order?: OrderRecord
  error?: string
}

export async function addOrderItems(
  orderId: string,
  items: CreateOrderItemPayload[]
): Promise<AddOrderItemsResult> {
  const config = getDeviceConfig()
  if (!config) {
    return { success: false, error: 'Device is not set up. Contact your administrator.' }
  }

  let session
  try {
    session = requireOnlineSession()
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}/orders/${orderId}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`
      },
      body: JSON.stringify({ items })
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data?.message ?? 'Failed to add items to order.' }
    }

    return { success: true, order: data }
  } catch (err) {
    log.error('[orders] Failed to add items to order:', err)
    return { success: false, error: 'Could not reach the server. Check your internet connection.' }
  }
}
