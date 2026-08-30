import log from 'electron-log'
import { getDeviceConfig } from '../database/deviceConfig'
import { replaceStaffCache, getCachedStaffList, CachedStaffMember } from '../database/staffCache'

export interface StaffListResult {
  staff: CachedStaffMember[]
  source: 'live' | 'cached'
  syncedAt: string | null
  error?: string
}

/**
 * Attempts a live fetch of the staff list from the API. On success, refreshes
 * the local cache and returns the fresh data. On any failure (offline, DNS,
 * timeout, non-2xx), falls back to whatever is in the local cache so the
 * login screen is never blank — this is the "offline shows cached staff"
 * behavior from the locked design.
 */
export async function getStaffListWithFallback(): Promise<StaffListResult> {
  const config = getDeviceConfig()
  if (!config) {
    return { staff: [], source: 'cached', syncedAt: null, error: 'Device not configured' }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const url = `${config.apiBaseUrl}/quick-cashier/staff-list?tenantId=${config.tenantId}&branchId=${config.branchId}`
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`Server responded ${response.status}`)
    }

    const data = (await response.json()) as Array<{
      id: string
      firstName: string
      lastName: string
      roles: string[]
      hasPassword: boolean
      hasPin: boolean
      pinHash: string | null
    }>

    replaceStaffCache(data)
    const { staff, syncedAt } = getCachedStaffList()
    log.info(`[staffSync] Live fetch succeeded, ${staff.length} staff cached.`)
    return { staff, source: 'live', syncedAt }
  } catch (err) {
    log.warn('[staffSync] Live fetch failed, falling back to cache:', (err as Error).message)
    const { staff, syncedAt } = getCachedStaffList()
    return {
      staff,
      source: 'cached',
      syncedAt,
      error: (err as Error).message
    }
  }
}
