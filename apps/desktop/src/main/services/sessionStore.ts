// E:\business-os\apps\desktop\src\main\services\sessionStore.ts
import log from 'electron-log'

export interface Session {
  mode: 'online' | 'offline'
  accessToken: string | null
  refreshToken: string | null
  user: {
    id: string
    firstName: string
    lastName: string
    roles: string[]
  }
}

let currentSession: Session | null = null

export function setSession(session: Session): void {
  currentSession = session
  log.info(`[session] Session set for user ${session.user.id} (mode: ${session.mode})`)
}

export function getSession(): Session | null {
  return currentSession
}

export function clearSession(): void {
  currentSession = null
  log.info('[session] Session cleared.')
}

export function requireOnlineSession(): Session {
  if (!currentSession) {
    throw new Error('Not logged in.')
  }
  if (currentSession.mode !== 'online' || !currentSession.accessToken) {
    throw new Error('This action requires an online session. Please reconnect and log in again.')
  }
  return currentSession
}
