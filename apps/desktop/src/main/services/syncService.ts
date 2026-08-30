import log from 'electron-log'
import { createOrder } from './ordersService'
import { getDeviceConfig } from '../database/deviceConfig'
import { requireOnlineSession } from './sessionStore'
import {
  enqueueOrder,
  getPendingOrders,
  markSyncing,
  markSynced,
  markFailedRetryable,
  markFailedFinal,
  isQueueEmpty,
  getAllOutboxOrders
} from '../database/outboxQueue'
import type { CreateOrderPayload } from './ordersService'

export interface AttemptCreateResult {
  success: boolean
  order?: unknown
  queued?: boolean
  error?: string
}

/**
 * Attempts to create the order live. If the failure is network-level
 * (server unreachable), the order is queued to the outbox for retry on
 * reconnect instead of being lost. A real server rejection (validation
 * error, etc.) is surfaced directly to the cashier and NOT queued, since
 * retrying an invalid payload will never succeed.
 */
export async function attemptCreateOrder(
  payload: CreateOrderPayload
): Promise<AttemptCreateResult> {
  const result = await createOrder(payload)

  if (result.success) {
    return { success: true, order: result.order }
  }

  if (result.errorKind === 'network') {
    enqueueOrder(payload)
    log.info(`[sync] Order ${payload.clientGeneratedId} queued to outbox after network failure.`)
    return { success: false, queued: true, error: result.error }
  }

  return { success: false, queued: false, error: result.error }
}

// ---------------------------------------------------------------------
// PUSH — batch endpoint, used instead of looping individual createOrder
// calls. The server's push-queued-orders path (SyncEngineService)
// additionally detects table conflicts between orders taken offline on
// different devices and flags them as SyncConflict rows for manual
// resolution, rather than just rejecting the second order outright the
// way a plain POST /orders call does via assertNoActiveOrderForTable.
// That distinction matters specifically for orders that were queued
// while offline, where a silent reject would strand cashier's ticket
// with no recovery path.
// ---------------------------------------------------------------------

export type PushOrderStatus = 'created' | 'already_existed' | 'conflict_flagged'

export interface PushQueuedOrdersResultItem {
  clientGeneratedId: string
  status: PushOrderStatus
  orderId: string
  conflictId?: string
}

interface PushQueuedOrdersApiResult {
  success: boolean
  results?: PushQueuedOrdersResultItem[]
  error?: string
  errorKind?: 'network' | 'rejected' | 'not_configured' | 'not_authenticated'
}

async function pushQueuedOrdersToServer(
  orders: CreateOrderPayload[]
): Promise<PushQueuedOrdersApiResult> {
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
    const response = await fetch(`${config.apiBaseUrl}/sync/push-queued-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`
      },
      body: JSON.stringify({ orders })
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data?.message ?? 'Failed to sync queued orders.',
        errorKind: 'rejected'
      }
    }

    return { success: true, results: data?.results ?? [] }
  } catch (err) {
    log.error('[sync] Failed to push queued orders (network):', err)
    return {
      success: false,
      error: 'Could not reach the server. Check your internet connection.',
      errorKind: 'network'
    }
  }
}

/**
 * Runs on reconnect (or manual trigger). Pushes all pending outbox orders
 * in a single batch call to /sync/push-queued-orders rather than looping
 * individual /orders calls, so the server can apply its conflict-flagging
 * logic across the whole batch. Each order's outcome is applied back to
 * its own outbox row individually:
 *   - created / already_existed  -> marked synced (already_existed means
 *     this exact clientGeneratedId was pushed before, e.g. a prior sync
 *     attempt succeeded server-side but the local ack was lost — treat
 *     as a successful sync, not an error)
 *   - conflict_flagged           -> marked synced (the order WAS created
 *     server-side, just alongside a SyncConflict record awaiting manual
 *     resolution) but logged distinctly so it surfaces to the cashier as
 *     "needs attention" rather than a silent success
 *   - the whole batch failing (network/rejected) -> every order in the
 *     batch stays 'pending' (network) or is marked failed (rejected),
 *     same handling as before
 */
export async function runOutboxSync(): Promise<{
  synced: number
  failed: number
  stillPending: number
  conflicts: number
}> {
  const pending = getPendingOrders()

  if (pending.length === 0) {
    return { synced: 0, failed: 0, stillPending: 0, conflicts: 0 }
  }

  for (const row of pending) {
    markSyncing(row.clientGeneratedId)
  }

  const result = await pushQueuedOrdersToServer(pending.map((row) => row.payload))

  if (!result.success) {
    if (result.errorKind === 'rejected') {
      // A batch-level rejection (e.g. malformed request) — not a
      // per-order validation issue, so mark every order in this batch
      // failed-final rather than guessing which ones were actually bad.
      for (const row of pending) {
        markFailedFinal(row.clientGeneratedId, result.error ?? 'Rejected by server.')
      }
      const stillPending = getPendingOrders().length
      return { synced: 0, failed: pending.length, stillPending, conflicts: 0 }
    }

    // network / not_authenticated / not_configured — retry later
    for (const row of pending) {
      markFailedRetryable(row.clientGeneratedId, result.error ?? 'Sync failed.')
    }
    const stillPending = getPendingOrders().length
    return { synced: 0, failed: 0, stillPending, conflicts: 0 }
  }

  let synced = 0
  let conflicts = 0
  const resultsByClientId = new Map((result.results ?? []).map((r) => [r.clientGeneratedId, r]))

  for (const row of pending) {
    const orderResult = resultsByClientId.get(row.clientGeneratedId)

    if (!orderResult) {
      // Server accepted the batch but didn't return a result for this
      // specific order — treat as retryable rather than silently losing it.
      markFailedRetryable(row.clientGeneratedId, "Server did not confirm this order's sync status.")
      continue
    }

    markSynced(row.clientGeneratedId, orderResult.orderId)
    synced += 1

    if (orderResult.status === 'conflict_flagged') {
      conflicts += 1
      log.warn(
        `[sync] Outbox order ${row.clientGeneratedId} synced as ${orderResult.orderId} but flagged as a table conflict (conflictId: ${orderResult.conflictId}). Needs manual resolution.`
      )
    } else {
      log.info(
        `[sync] Outbox order ${row.clientGeneratedId} synced as server order ${orderResult.orderId} (${orderResult.status}).`
      )
    }
  }

  const stillPending = getPendingOrders().length
  return { synced, failed: 0, stillPending, conflicts }
}

export function getOutboxIsEmpty(): boolean {
  return isQueueEmpty()
}

export function getOutboxHistory() {
  return getAllOutboxOrders()
}
