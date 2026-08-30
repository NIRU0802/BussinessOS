import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import log from 'electron-log'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const dbPath = join(app.getPath('userData'), 'business-os-pos.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS device_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      tenant_id TEXT NOT NULL,
      tenant_slug TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      api_base_url TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS staff_cache (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      roles TEXT NOT NULL,
      has_password INTEGER NOT NULL,
      has_pin INTEGER NOT NULL,
      pin_hash TEXT,
      synced_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outbox_orders (
      client_generated_id TEXT PRIMARY KEY,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempt_count INTEGER NOT NULL DEFAULT 0,
      last_attempt_at TEXT,
      error_message TEXT,
      server_order_id TEXT,
      created_at TEXT NOT NULL
    );
  `)

  log.info('[db] SQLite database ready at', dbPath)
  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
