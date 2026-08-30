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
    }) => ipcRenderer.invoke('device:set-config', config)
  },
  staff: {
    getList: () => ipcRenderer.invoke('staff:get-list')
  },
  auth: {
    login: (email: string, password: string) => ipcRenderer.invoke('auth:login', email, password),
    quickLogin: (userId: string, pin: string) => ipcRenderer.invoke('auth:quick-login', userId, pin)
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
