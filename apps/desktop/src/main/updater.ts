import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'

// -----------------------------------------------------------------------
// Auto-update wiring.
//
// IMPORTANT SYNC-SAFETY RULE:
// This app has a local SQLite outbox sync queue (offline orders waiting to
// push to the server). We must NEVER force a restart-to-update while that
// queue is non-empty, or we risk losing/duplicating unsynced orders.
//
// The renderer is the source of truth for "is the outbox empty" since it
// owns the sync engine. It answers via the 'sync:isQueueEmpty' IPC handler,
// which must already be implemented in the existing sync module — this file
// only calls it, it does not implement sync logic.
// -----------------------------------------------------------------------

autoUpdater.logger = log
;(autoUpdater.logger as typeof log).transports.file.level = 'info'
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = false

// Replace with your real update feed once the VPS (Phase 13) is live.
// This is also configured in electron-builder.yml under `publish`; setting
// it here too makes local overrides / env-based feeds possible if needed.
const UPDATE_FEED_URL = process.env.UPDATE_FEED_URL || 'https://updates.yourplatform.app/latest'

let updateReadyToInstall = false
let mainWindowRef: BrowserWindow | null = null
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000 // every 4 hours

export function initAutoUpdater(mainWindow: BrowserWindow): void {
  mainWindowRef = mainWindow

  try {
    autoUpdater.setFeedURL({ provider: 'generic', url: UPDATE_FEED_URL })
  } catch (err) {
    log.warn('[updater] Failed to set feed URL, using electron-builder.yml default', err)
  }

  autoUpdater.on('checking-for-update', () => {
    log.info('[updater] Checking for update...')
  })

  autoUpdater.on('update-available', (info) => {
    log.info('[updater] Update available:', info.version)
  })

  autoUpdater.on('update-not-available', () => {
    log.info('[updater] No update available.')
  })

  autoUpdater.on('error', (err) => {
    log.error('[updater] Error while checking/downloading update:', err)
  })

  autoUpdater.on('download-progress', (progress) => {
    log.info(`[updater] Download progress: ${Math.round(progress.percent)}%`)
  })

  autoUpdater.on('update-downloaded', (info) => {
    log.info('[updater] Update downloaded:', info.version)
    updateReadyToInstall = true
    promptUserToInstallWhenSafe(info.version)
  })

  // Initial check shortly after launch (let the app settle first).
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => log.error('[updater] Initial check failed', err))
  }, 15_000)

  // Periodic background checks.
  setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => log.error('[updater] Periodic check failed', err))
  }, CHECK_INTERVAL_MS)
}

/**
 * Asks the renderer whether the outbox sync queue is empty. The renderer
 * owns the sync engine and must implement a handler for this channel that
 * returns a boolean. This function does not implement sync logic itself.
 */
function isSafeToUpdate(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!mainWindowRef || mainWindowRef.isDestroyed()) {
      resolve(false)
      return
    }

    const responseChannel = 'sync:isQueueEmpty:response'
    const timeout = setTimeout(() => {
      ipcMain.removeAllListeners(responseChannel)
      resolve(false) // fail safe: assume unsafe if renderer doesn't answer
    }, 5000)

    ipcMain.once(responseChannel, (_event, isEmpty: boolean) => {
      clearTimeout(timeout)
      resolve(Boolean(isEmpty))
    })

    mainWindowRef.webContents.send('sync:isQueueEmpty:request')
  })
}

async function promptUserToInstallWhenSafe(version: string): Promise<void> {
  const safe = await isSafeToUpdate()

  if (!safe) {
    log.info('[updater] Update downloaded but outbox queue is not empty. Deferring prompt.')
    // Retry in the background until the queue clears or the user quits.
    const retryInterval = setInterval(async () => {
      if (!updateReadyToInstall) {
        clearInterval(retryInterval)
        return
      }
      const nowSafe = await isSafeToUpdate()
      if (nowSafe) {
        clearInterval(retryInterval)
        showRestartDialog(version)
      }
    }, 60_000) // re-check every minute
    return
  }

  showRestartDialog(version)
}

function showRestartDialog(version: string): void {
  if (!mainWindowRef || mainWindowRef.isDestroyed()) return

  dialog
    .showMessageBox(mainWindowRef, {
      type: 'info',
      title: 'Update Available',
      message: `A new version is available (v${version}) — restart to update`,
      detail:
        'Business OS POS will restart to apply the update. Any unsynced data has been confirmed safe to update.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1
    })
    .then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true)
      }
    })
}

/**
 * Call this from app.on('before-quit') if you want a final safety check
 * before silently installing on quit. Not enabled by default since
 * autoInstallOnAppQuit is false above — install only happens via explicit
 * user confirmation in showRestartDialog.
 */
export function isUpdateReadyToInstall(): boolean {
  return updateReadyToInstall
}

app.on('before-quit', () => {
  // No forced install here — respects autoInstallOnAppQuit = false.
  // This hook exists for future use (e.g. logging shutdown state).
})
