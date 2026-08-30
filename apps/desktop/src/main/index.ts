import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initAutoUpdater } from './updater'
import { getDb, closeDb } from './database/db'
import { registerIpcHandlers } from './ipcHandlers'
import { runOutboxSync, getOutboxIsEmpty } from './services/syncService'
import log from 'electron-log'

const OUTBOX_SYNC_INTERVAL_MS = 30_000
let syncIntervalHandle: NodeJS.Timeout | null = null
let syncInFlight = false

async function trySyncOutbox(): Promise<void> {
  if (syncInFlight) return
  const empty = getOutboxIsEmpty()
  if (empty) return

  syncInFlight = true
  try {
    const result = await runOutboxSync()
    if (result.synced > 0 || result.failed > 0) {
      log.info(
        `[sync] Outbox sync pass: ${result.synced} synced, ${result.failed} failed, ${result.stillPending} still pending.`
      )
    }
  } catch (err) {
    log.error('[sync] Outbox sync pass threw an error:', err)
  } finally {
    syncInFlight = false
  }
}

function startOutboxSyncLoop(): void {
  if (syncIntervalHandle) return
  syncIntervalHandle = setInterval(() => {
    void trySyncOutbox()
  }, OUTBOX_SYNC_INTERVAL_MS)
}

function stopOutboxSyncLoop(): void {
  if (syncIntervalHandle) {
    clearInterval(syncIntervalHandle)
    syncIntervalHandle = null
  }
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  if (!is.dev) {
    initAutoUpdater(mainWindow)
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.gr8.businessos.pos')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  // Renderer forwards its "online" event here for a faster reaction than
  // waiting for the next poll tick. Harmless if it fires redundantly
  // alongside the interval — trySyncOutbox() no-ops if a sync is already
  // in flight or the queue is empty.
  ipcMain.on('sync:renderer-online', () => {
    void trySyncOutbox()
  })

  getDb()
  registerIpcHandlers()
  startOutboxSyncLoop()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopOutboxSyncLoop()
  closeDb()
})
