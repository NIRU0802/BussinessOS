import log from 'electron-log'
import { getDeviceConfig } from '../database/deviceConfig'
import { requireOnlineSession } from './sessionStore'

export interface TableFetchResult {
  success: boolean
  tables?: unknown[] // shape owned by apps/api Table model — id, label, capacity, status, mergedIntoTableId
  error?: string
}

export async function getTablesForBranch(branchId: string): Promise<TableFetchResult> {
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
    const response = await fetch(`${config.apiBaseUrl}/tables?branchId=${branchId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`
      }
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data?.message ?? 'Failed to load tables.' }
    }

    return { success: true, tables: data }
  } catch (err) {
    log.error('[tables] Failed to fetch tables:', err)
    return { success: false, error: 'Could not reach the server. Check your internet connection.' }
  }
}
