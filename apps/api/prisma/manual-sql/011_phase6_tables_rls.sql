-- Phase 6: Tables, QR Codes, QR Sessions, Dining Sessions, Reservations
-- Creates physical tables matching schema.prisma, adds the FK from
-- orders.table_id -> tables.id, and applies standard tenant-scoped RLS
-- (matching the current_setting('app.current_tenant_id', true) pattern
-- established in 010_orders_rls.sql).

BEGIN;

-- ---------------------------------------------------------------------
-- tables
-- ---------------------------------------------------------------------
CREATE TABLE tables (
  id                    TEXT PRIMARY KEY,
  tenant_id             TEXT NOT NULL,
  branch_id             TEXT NOT NULL,
  label                 TEXT NOT NULL,
  capacity              INTEGER NOT NULL DEFAULT 2,
  status                TEXT NOT NULL DEFAULT 'available',
  merged_into_table_id  TEXT,
  qr_token_rotated_at   TIMESTAMPTZ,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ,

  CONSTRAINT fk_tables_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_tables_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_tables_merged_into FOREIGN KEY (merged_into_table_id) REFERENCES tables(id) ON DELETE SET NULL,
  CONSTRAINT chk_tables_status CHECK (status IN ('available','occupied','preparing','bill_requested','paid')),
  CONSTRAINT uq_tables_branch_label UNIQUE (branch_id, label)
);

CREATE INDEX idx_tables_tenant_branch ON tables (tenant_id, branch_id);
CREATE INDEX idx_tables_tenant_branch_status ON tables (tenant_id, branch_id, status);

-- ---------------------------------------------------------------------
-- qr_codes
-- ---------------------------------------------------------------------
CREATE TABLE qr_codes (
  id           TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL,
  branch_id    TEXT NOT NULL,
  table_id     TEXT NOT NULL,
  token_hash   TEXT NOT NULL UNIQUE,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at   TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,

  CONSTRAINT fk_qr_codes_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_qr_codes_table FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE
);

CREATE INDEX idx_qr_codes_tenant ON qr_codes (tenant_id);
CREATE INDEX idx_qr_codes_tenant_branch ON qr_codes (tenant_id, branch_id);
CREATE INDEX idx_qr_codes_tenant_table ON qr_codes (tenant_id, table_id);

-- ---------------------------------------------------------------------
-- qr_sessions
-- ---------------------------------------------------------------------
CREATE TABLE qr_sessions (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  branch_id     TEXT NOT NULL,
  table_id      TEXT NOT NULL,
  qr_code_id    TEXT NOT NULL,
  session_hash  TEXT NOT NULL UNIQUE,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,

  CONSTRAINT fk_qr_sessions_qr_code FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id) ON DELETE CASCADE,
  CONSTRAINT fk_qr_sessions_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_qr_sessions_table FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE
);

CREATE INDEX idx_qr_sessions_tenant ON qr_sessions (tenant_id);
CREATE INDEX idx_qr_sessions_tenant_branch ON qr_sessions (tenant_id, branch_id);
CREATE INDEX idx_qr_sessions_tenant_table ON qr_sessions (tenant_id, table_id);
CREATE INDEX idx_qr_sessions_tenant_expires ON qr_sessions (tenant_id, expires_at);

-- ---------------------------------------------------------------------
-- dining_sessions
-- ---------------------------------------------------------------------
CREATE TABLE dining_sessions (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL,
  branch_id   TEXT NOT NULL,
  table_id    TEXT NOT NULL,
  party_size  INTEGER,
  status      TEXT NOT NULL DEFAULT 'active',
  opened_by   TEXT,
  opened_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_by   TEXT,
  closed_at   TIMESTAMPTZ,
  notes       TEXT,

  CONSTRAINT fk_dining_sessions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_dining_sessions_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_dining_sessions_table FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE,
  CONSTRAINT chk_dining_sessions_status CHECK (status IN ('active','closed'))
);

CREATE INDEX idx_dining_sessions_tenant_branch ON dining_sessions (tenant_id, branch_id);
CREATE INDEX idx_dining_sessions_tenant_table_status ON dining_sessions (tenant_id, table_id, status);

-- ---------------------------------------------------------------------
-- reservations
-- ---------------------------------------------------------------------
CREATE TABLE reservations (
  id               TEXT PRIMARY KEY,
  tenant_id        TEXT NOT NULL,
  branch_id        TEXT NOT NULL,
  table_id         TEXT,
  customer_name    TEXT NOT NULL,
  customer_phone   TEXT NOT NULL,
  party_size       INTEGER NOT NULL,
  reserved_for     TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 90,
  status           TEXT NOT NULL DEFAULT 'pending',
  notes            TEXT,
  created_by       TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at     TIMESTAMPTZ,

  CONSTRAINT fk_reservations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_reservations_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_reservations_table FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL,
  CONSTRAINT chk_reservations_status CHECK (status IN ('pending','confirmed','seated','completed','cancelled','no_show'))
);

CREATE INDEX idx_reservations_tenant_branch_reserved_for ON reservations (tenant_id, branch_id, reserved_for);
CREATE INDEX idx_reservations_tenant_table ON reservations (tenant_id, table_id);
CREATE INDEX idx_reservations_tenant_status ON reservations (tenant_id, status);

-- ---------------------------------------------------------------------
-- Retrofit FK onto existing orders.table_id (column already exists from
-- Phase 4; Prisma now models the relation, this adds real DB integrity)
-- ---------------------------------------------------------------------
ALTER TABLE orders
  ADD CONSTRAINT fk_orders_table FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- RLS — standard tenant-scoped policy on every new table, matching the
-- current_setting('app.current_tenant_id', true) pattern from
-- 010_orders_rls.sql. Grants to business_os_app are assumed already
-- applied globally (as in 010) — not repeated here.
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS tenant_isolation_tables ON tables;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_tables ON tables
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_qr_codes ON qr_codes;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_qr_codes ON qr_codes
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_qr_sessions ON qr_sessions;
ALTER TABLE qr_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_qr_sessions ON qr_sessions
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_dining_sessions ON dining_sessions;
ALTER TABLE dining_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dining_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_dining_sessions ON dining_sessions
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_reservations ON reservations;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_reservations ON reservations
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

COMMIT;