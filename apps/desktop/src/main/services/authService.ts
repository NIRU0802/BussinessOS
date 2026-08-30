import bcrypt from 'bcryptjs'
import log from 'electron-log'
import { getDeviceConfig } from '../database/deviceConfig'
import { getCachedStaffList } from '../database/staffCache'

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

/**
 * Admin/Manager email+password login. ALWAYS requires the network — there
 * is no offline path for password-based accounts, per the locked design
 * (only PIN-based staff — Manager/Cashier — can operate offline; Admin
 * always requires internet).
 */
export async function loginOnline(email: string, password: string): Promise<LoginResult> {
  const config = getDeviceConfig()
  if (!config) {
    return { success: false, error: 'Device is not set up. Contact your administrator.' }
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, tenantSlug: config.tenantSlug })
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data?.message ?? 'Login failed.' }
    }

    return {
      success: true,
      mode: 'online',
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user
    }
  } catch (err) {
    log.error('[auth] Online login request failed:', err)
    return {
      success: false,
      error: 'Could not reach the server. Check your internet connection.'
    }
  }
}

/**
 * PIN-based login for Manager/Cashier accounts. Tries the live endpoint
 * first; if that fails (offline/network error — NOT a wrong-PIN rejection,
 * which is a valid online response we should surface as-is), falls back to
 * verifying the PIN locally against the cached bcrypt hash and issuing a
 * temporary offline session. The offline session carries only role names
 * (no fine-grained permissions, since the cache doesn't have them yet) and
 * must be reconciled with a real server login the next time connectivity
 * returns.
 */
export async function quickLogin(userId: string, pin: string): Promise<QuickLoginResult> {
  const config = getDeviceConfig()
  if (!config) {
    return { success: false, error: 'Device is not set up. Contact your administrator.' }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)

    const url = `${config.apiBaseUrl}/quick-cashier/quick-login?tenantId=${config.tenantId}`
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, pin, branchId: config.branchId })
    })
    clearTimeout(timeout)

    const data = await response.json()

    if (!response.ok) {
      // A real rejection from the server (wrong PIN, quick-cashier disabled,
      // account inactive, etc.) — surface it as-is, do NOT fall back to
      // offline verification, since the server was reachable and gave a
      // definitive answer.
      return { success: false, error: data?.message ?? 'Login failed.' }
    }

    return { success: true, mode: 'online', accessToken: data.accessToken, user: data.user }
  } catch (err) {
    log.warn(
      '[auth] Live quick-login unreachable, attempting offline verification:',
      (err as Error).message
    )
    return verifyPinOffline(userId, pin)
  }
}

function verifyPinOffline(userId: string, pin: string): QuickLoginResult {
  const { staff } = getCachedStaffList()
  const user = staff.find((s) => s.id === userId)

  if (!user) {
    return { success: false, error: 'Staff record not found in offline cache.' }
  }

  if (user.roles.includes('OWNER') || user.roles.includes('ADMIN')) {
    return {
      success: false,
      error: 'Admin accounts require an internet connection to log in.'
    }
  }

  if (!user.hasPin || !user.pinHash) {
    return { success: false, error: 'No PIN is configured for offline use on this device.' }
  }

  const valid = bcrypt.compareSync(pin, user.pinHash)
  if (!valid) {
    return { success: false, error: 'Incorrect PIN.' }
  }

  log.info(`[auth] Offline PIN verification succeeded for user ${userId}.`)

  return {
    success: true,
    mode: 'offline',
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles
    }
  }
}
