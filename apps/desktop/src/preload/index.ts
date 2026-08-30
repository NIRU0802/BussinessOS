import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  device: {
    getConfig: () => ipcRenderer.invoke('device:get-config'),
    isConfigured: () => ipcRenderer.invoke('device:is-configured'),
    setConfig: (config: {
      tenantId: string
      tenantSlug: string
      branchId: string
      apiBaseUrl: string
    }) => ipcRenderer.invoke('device:set-config', config),
    getDeviceId: () => ipcRenderer.invoke('device:get-device-id')
  },
  staff: {
    getList: () => ipcRenderer.invoke('staff:get-list')
  },
  auth: {
    login: (email: string, password: string) => ipcRenderer.invoke('auth:login', email, password),
    quickLogin: (userId: string, pin: string) => ipcRenderer.invoke('auth:quick-login', userId, pin)
  },
  menu: {
    getEffective: (branchId: string) => ipcRenderer.invoke('menu:get-effective', branchId)
  },
  orders: {
    create: (payload: unknown) => ipcRenderer.invoke('orders:create', payload),
    splitBill: (orderId: string, payload: unknown) =>
      ipcRenderer.invoke('orders:split-bill', orderId, payload),
    getOpenForTable: (branchId: string, tableId: string) =>
      ipcRenderer.invoke('orders:get-open-for-table', branchId, tableId),
    addItems: (orderId: string, items: unknown[]) =>
      ipcRenderer.invoke('orders:add-items', orderId, items)
  },
  sync: {
    runOutboxSync: () => ipcRenderer.invoke('sync:run-outbox-sync'),
    isQueueEmpty: () => ipcRenderer.invoke('sync:is-queue-empty'),
    getOutboxHistory: () => ipcRenderer.invoke('sync:get-outbox-history'),
    notifyOnline: () => ipcRenderer.send('sync:renderer-online')
  },
  tables: {
    getForBranch: (branchId: string) => ipcRenderer.invoke('tables:get-for-branch', branchId)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
