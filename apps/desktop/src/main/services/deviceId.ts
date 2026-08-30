// E:\business-os\apps\desktop\src\main\services\deviceId.ts
import { app } from 'electron'
import { randomUUID } from 'crypto'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import log from 'electron-log'

let cachedDeviceId: string | null = null

function getDeviceIdFilePath(): string {
  return join(app.getPath('userData'), 'device-id.json')
}

/**
 * Stable per-installation device identifier, generated once and persisted
 * to a flat file in Electron's userData directory. Deliberately NOT part
 * of device_config (SQLite) or synced to the server's DeviceConfig table —
 * this is a local machine fact, not tenant-scoped data. Used as
 * CreateOrderDto.deviceId and will become the outbox sync key once the
 * offline order queue (Phase: Desktop item 3) is built.
 */
export function getOrCreateDeviceId(): string {
  if (cachedDeviceId) return cachedDeviceId

  const filePath = getDeviceIdFilePath()

  if (existsSync(filePath)) {
    try {
      const data = JSON.parse(readFileSync(filePath, 'utf-8'))
      if (typeof data.deviceId === 'string' && data.deviceId.length > 0) {
        const existingId: string = data.deviceId
        cachedDeviceId = existingId
        return existingId
      }
    } catch (err) {
      log.warn('[deviceId] Failed to read existing device-id.json, regenerating:', err)
    }
  }

  const newId = randomUUID()
  writeFileSync(
    filePath,
    JSON.stringify({ deviceId: newId, createdAt: new Date().toISOString() }),
    'utf-8'
  )
  cachedDeviceId = newId
  log.info(`[deviceId] Generated new device id: ${newId}`)
  return newId
}
