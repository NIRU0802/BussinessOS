import { getDeviceConfig } from '../database/deviceConfig'
import { getSession } from './sessionStore'
import log from 'electron-log'

export interface Branding {
  businessName: string | null
  logoUrl: string | null
  primaryColor: string
  primaryColorDark: string
  inkColor: string
  surfaceColor: string
  fontDisplay: string
}

const DEFAULTS: Branding = {
  businessName: null,
  logoUrl: null,
  primaryColor: '#b8452f',
  primaryColorDark: '#963722',
  inkColor: '#111318',
  surfaceColor: '#ffffff',
  fontDisplay: 'Inter'
}

export async function fetchBranding(): Promise<Branding> {
  const config = getDeviceConfig()
  const session = getSession()

  if (!config || !session?.accessToken) {
    return DEFAULTS
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)

    const response = await fetch(`${config.apiBaseUrl}/branding`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${session.accessToken}` }
    })
    clearTimeout(timeout)

    if (!response.ok) {
      log.warn('[branding] Failed to fetch branding, using defaults')
      return DEFAULTS
    }

    const data = await response.json()
    return { ...DEFAULTS, ...data }
  } catch (err) {
    log.warn('[branding] Branding request failed, using defaults:', (err as Error).message)
    return DEFAULTS
  }
}
