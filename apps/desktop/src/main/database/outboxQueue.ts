import { getDb } from './db'
import type { CreateOrderPayload } from '../services/ordersService'

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

interface RawRow {
  client_generated_id: string
  payload_json: string
  status: OutboxStatus
  attempt_count: number
  last_attempt_at: string | null
  error_message: string | null
  server_order_id: string | null
  created_at: string
}

function toOutboxRow(row: RawRow): OutboxOrderRow {
  return {
    clientGeneratedId: row.client_generated_id,
    payload: JSON.parse(row.payload_json),
    status: row.status,
    attemptCount: row.attempt_count,
    lastAttemptAt: row.last_attempt_at,
    errorMessage: row.error_message,
    serverOrderId: row.server_order_id,
    createdAt: row.created_at
  }
}

/**
 * Adds an order to the outbox. Idempotent on clientGeneratedId — if this
 * order is already queued (e.g. app crashed mid-sync and retried the
 * create call), this is a silent no-op rather than a duplicate row.
 */
export function enqueueOrder(payload: CreateOrderPayload): void {
  const db = getDb()
  const createdAt = new Date().toISOString()

  db.prepare(
    `INSERT INTO outbox_orders (client_generated_id, payload_json, status, attempt_count, created_at)
     VALUES (@clientGeneratedId, @payloadJson, 'pending', 0, @createdAt)
     ON CONFLICT(client_generated_id) DO NOTHING`
  ).run({
    clientGeneratedId: payload.clientGeneratedId,
    payloadJson: JSON.stringify(payload),
    createdAt
  })
}

export function getPendingOrders(): OutboxOrderRow[] {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT client_generated_id, payload_json, status, attempt_count, last_attempt_at, error_message, server_order_id, created_at
       FROM outbox_orders WHERE status IN ('pending', 'syncing') ORDER BY created_at ASC`
    )
    .all() as RawRow[]
  return rows.map(toOutboxRow)
}

export function getAllOutboxOrders(): OutboxOrderRow[] {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT client_generated_id, payload_json, status, attempt_count, last_attempt_at, error_message, server_order_id, created_at
       FROM outbox_orders ORDER BY created_at DESC`
    )
    .all() as RawRow[]
  return rows.map(toOutboxRow)
}

export function markSyncing(clientGeneratedId: string): void {
  const db = getDb()
  db.prepare(
    `UPDATE outbox_orders SET status = 'syncing', last_attempt_at = @now, attempt_count = attempt_count + 1
     WHERE client_generated_id = @id`
  ).run({ id: clientGeneratedId, now: new Date().toISOString() })
}

export function markSynced(clientGeneratedId: string, serverOrderId: string): void {
  const db = getDb()
  db.prepare(
    `UPDATE outbox_orders SET status = 'synced', server_order_id = @serverOrderId, error_message = NULL
     WHERE client_generated_id = @id`
  ).run({ id: clientGeneratedId, serverOrderId })
}

/**
 * A network-level failure (server unreachable) — goes back to 'pending' so
 * the next reconnect-sync pass retries it. Distinct from markFailedFinal,
 * which is for a real server rejection (e.g. validation error) that will
 * never succeed on retry and needs a human to look at it.
 */
export function markFailedRetryable(clientGeneratedId: string, errorMessage: string): void {
  const db = getDb()
  db.prepare(
    `UPDATE outbox_orders SET status = 'pending', error_message = @errorMessage WHERE client_generated_id = @id`
  ).run({ id: clientGeneratedId, errorMessage })
}

export function markFailedFinal(clientGeneratedId: string, errorMessage: string): void {
  const db = getDb()
  db.prepare(
    `UPDATE outbox_orders SET status = 'failed', error_message = @errorMessage WHERE client_generated_id = @id`
  ).run({ id: clientGeneratedId, errorMessage })
}

export function isQueueEmpty(): boolean {
  const db = getDb()
  const row = db
    .prepare(`SELECT COUNT(*) as count FROM outbox_orders WHERE status IN ('pending', 'syncing')`)
    .get() as { count: number }
  return row.count === 0
}
