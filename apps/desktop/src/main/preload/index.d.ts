import { ElectronAPI } from '@electron-toolkit/preload'

interface DeviceConfig {
  tenantId: string
  tenantSlug: string
  branchId: string
  apiBaseUrl: string
  updatedAt: string
}

interface StaffMember {
  id: string
  firstName: string
  lastName: string
  roles: string[]
  hasPassword: boolean
  hasPin: boolean
  pinHash: string | null
  syncedAt: string
}

interface StaffListResult {
  staff: StaffMember[]
  source: 'live' | 'cached'
  syncedAt: string | null
  error?: string
}

interface LoginResult {
  success: boolean
  mode?: 'online'
  accessToken?: string
  refreshToken?: string
  user?: { id: string; firstName: string; lastName: string; email: string; roles: string[] }
  error?: string
}

interface QuickLoginResult {
  success: boolean
  mode?: 'online' | 'offline'
  accessToken?: string
  user?: { id: string; firstName: string; lastName: string; roles: string[] }
  error?: string
}

interface Api {
  device: {
    getConfig: () => Promise<DeviceConfig | null>
    isConfigured: () => Promise<boolean>
    setConfig: (config: {
      tenantId: string
      tenantSlug: string
      branchId: string
      apiBaseUrl: string
    }) => Promise<DeviceConfig>
  }
  staff: {
    getList: () => Promise<StaffListResult>
  }
  auth: {
    login: (email: string, password: string) => Promise<LoginResult>
    quickLogin: (userId: string, pin: string) => Promise<QuickLoginResult>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
