// E:\business-os\apps\desktop\src\main\services\menuService.ts
import log from 'electron-log'
import { getDeviceConfig } from '../database/deviceConfig'
import { requireOnlineSession } from './sessionStore'

export interface MenuFetchResult {
  success: boolean
  items?: unknown[] // shape owned by apps/api EffectiveMenuItem — not re-declared here
  error?: string
}

export async function getEffectiveMenu(branchId: string): Promise<MenuFetchResult> {
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
    const response = await fetch(`${config.apiBaseUrl}/menu/branch/${branchId}/effective`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`
      }
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data?.message ?? 'Failed to load menu.' }
    }

    return { success: true, items: data }
  } catch (err) {
    log.error('[menu] Failed to fetch effective menu:', err)
    return { success: false, error: 'Could not reach the server. Check your internet connection.' }
  }
}
