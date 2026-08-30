import { getDb } from './db'

export interface DeviceConfig {
  tenantId: string
  tenantSlug: string
  branchId: string
  apiBaseUrl: string
  updatedAt: string
}

export function getDeviceConfig(): DeviceConfig | null {
  const db = getDb()
  const row = db
    .prepare(
      `SELECT tenant_id as tenantId, tenant_slug as tenantSlug, branch_id as branchId,
              api_base_url as apiBaseUrl, updated_at as updatedAt
       FROM device_config WHERE id = 1`
    )
    .get() as DeviceConfig | undefined
  return row ?? null
}

export function setDeviceConfig(config: {
  tenantId: string
  tenantSlug: string
  branchId: string
  apiBaseUrl: string
}): DeviceConfig {
  const db = getDb()
  const updatedAt = new Date().toISOString()

  db.prepare(
    `INSERT INTO device_config (id, tenant_id, tenant_slug, branch_id, api_base_url, updated_at)
     VALUES (1, @tenantId, @tenantSlug, @branchId, @apiBaseUrl, @updatedAt)
     ON CONFLICT(id) DO UPDATE SET
       tenant_id = excluded.tenant_id,
       tenant_slug = excluded.tenant_slug,
       branch_id = excluded.branch_id,
       api_base_url = excluded.api_base_url,
       updated_at = excluded.updated_at`
  ).run({ ...config, updatedAt })

  return { ...config, updatedAt }
}

export function isDeviceConfigured(): boolean {
  return getDeviceConfig() !== null
}
