import { getDb } from './db'

export interface CachedStaffMember {
  id: string
  firstName: string
  lastName: string
  roles: string[]
  hasPassword: boolean
  hasPin: boolean
  pinHash: string | null
  syncedAt: string
}

interface StaffApiResponseItem {
  id: string
  firstName: string
  lastName: string
  roles: string[]
  hasPassword: boolean
  hasPin: boolean
  pinHash: string | null
}

export function replaceStaffCache(staff: StaffApiResponseItem[]): void {
  const db = getDb()
  const syncedAt = new Date().toISOString()

  const insert = db.prepare(
    `INSERT INTO staff_cache (id, first_name, last_name, roles, has_password, has_pin, pin_hash, synced_at)
     VALUES (@id, @firstName, @lastName, @roles, @hasPassword, @hasPin, @pinHash, @syncedAt)
     ON CONFLICT(id) DO UPDATE SET
       first_name = excluded.first_name,
       last_name = excluded.last_name,
       roles = excluded.roles,
       has_password = excluded.has_password,
       has_pin = excluded.has_pin,
       pin_hash = excluded.pin_hash,
       synced_at = excluded.synced_at`
  )

  const incomingIds = new Set(staff.map((s) => s.id))

  const transact = db.transaction((items: StaffApiResponseItem[]) => {
    for (const item of items) {
      insert.run({
        id: item.id,
        firstName: item.firstName,
        lastName: item.lastName,
        roles: JSON.stringify(item.roles),
        hasPassword: item.hasPassword ? 1 : 0,
        hasPin: item.hasPin ? 1 : 0,
        pinHash: item.pinHash,
        syncedAt
      })
    }

    // Remove cached staff no longer returned by the server (deactivated, etc.)
    const existing = db.prepare(`SELECT id FROM staff_cache`).all() as { id: string }[]
    const del = db.prepare(`DELETE FROM staff_cache WHERE id = ?`)
    for (const row of existing) {
      if (!incomingIds.has(row.id)) del.run(row.id)
    }
  })

  transact(staff)
}

export function getCachedStaffList(): { staff: CachedStaffMember[]; syncedAt: string | null } {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT id, first_name as firstName, last_name as lastName, roles,
              has_password as hasPassword, has_pin as hasPin, pin_hash as pinHash, synced_at as syncedAt
       FROM staff_cache ORDER BY first_name ASC`
    )
    .all() as Array<{
    id: string
    firstName: string
    lastName: string
    roles: string
    hasPassword: number
    hasPin: number
    pinHash: string | null
    syncedAt: string
  }>

  const staff: CachedStaffMember[] = rows.map((r) => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    roles: JSON.parse(r.roles),
    hasPassword: Boolean(r.hasPassword),
    hasPin: Boolean(r.hasPin),
    pinHash: r.pinHash,
    syncedAt: r.syncedAt
  }))

  return { staff, syncedAt: staff[0]?.syncedAt ?? null }
}
