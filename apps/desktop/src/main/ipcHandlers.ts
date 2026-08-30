import { ipcMain } from 'electron'
import { getDeviceConfig, setDeviceConfig, isDeviceConfigured } from './database/deviceConfig'
import { getStaffListWithFallback } from './services/staffSync'
import { loginOnline, quickLogin } from './services/authService'
import { setSession } from './services/sessionStore'
import { getEffectiveMenu } from './services/menuService'
import { getOrCreateDeviceId } from './services/deviceId'
import {
  splitBill,
  SplitBillPayload,
  CreateOrderPayload,
  getOpenOrderForTable,
  addOrderItems,
  CreateOrderItemPayload
} from './services/ordersService'
import {
  attemptCreateOrder,
  runOutboxSync,
  getOutboxIsEmpty,
  getOutboxHistory
} from './services/syncService'
import { getTablesForBranch } from './services/tablesService'

export function registerIpcHandlers(): void {
  ipcMain.handle('device:get-device-id', () => getOrCreateDeviceId())
  ipcMain.handle('device:get-config', () => getDeviceConfig())
  ipcMain.handle('device:is-configured', () => isDeviceConfigured())
  ipcMain.handle(
    'device:set-config',
    (
      _event,
      config: { tenantId: string; tenantSlug: string; branchId: string; apiBaseUrl: string }
    ) => setDeviceConfig(config)
  )
  ipcMain.handle('staff:get-list', () => getStaffListWithFallback())

  ipcMain.handle('auth:login', async (_event, email: string, password: string) => {
    const result = await loginOnline(email, password)
    if (result.success && result.user) {
      setSession({
        mode: 'online',
        accessToken: result.accessToken ?? null,
        refreshToken: result.refreshToken ?? null,
        user: {
          id: result.user.id,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          roles: result.user.roles
        }
      })
    }
    return result
  })

  ipcMain.handle('auth:quick-login', async (_event, userId: string, pin: string) => {
    const result = await quickLogin(userId, pin)
    if (result.success && result.user) {
      setSession({
        mode: result.mode ?? 'offline',
        accessToken: result.accessToken ?? null,
        refreshToken: null,
        user: {
          id: result.user.id,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          roles: result.user.roles
        }
      })
    }
    return result
  })

  ipcMain.handle('menu:get-effective', (_event, branchId: string) => getEffectiveMenu(branchId))

  ipcMain.handle('orders:create', (_event, payload: CreateOrderPayload) =>
    attemptCreateOrder(payload)
  )
  ipcMain.handle('orders:split-bill', (_event, orderId: string, payload: SplitBillPayload) =>
    splitBill(orderId, payload)
  )

  ipcMain.handle('orders:get-open-for-table', (_event, branchId: string, tableId: string) =>
    getOpenOrderForTable(branchId, tableId)
  )
  ipcMain.handle('orders:add-items', (_event, orderId: string, items: CreateOrderItemPayload[]) =>
    addOrderItems(orderId, items)
  )

  ipcMain.handle('sync:run-outbox-sync', () => runOutboxSync())
  ipcMain.handle('sync:is-queue-empty', () => getOutboxIsEmpty())
  ipcMain.handle('sync:get-outbox-history', () => getOutboxHistory())

  ipcMain.handle('tables:get-for-branch', (_event, branchId: string) =>
    getTablesForBranch(branchId)
  )
}
