-- ============================================================
-- Phase 5 — Menu & Catalog Engine additions
-- Adds tax-class link + availability windows to existing menu
-- tables, creates combos/combo_items, and applies RLS.
-- ============================================================

-- ------------------------------------------------------------
-- 1. menu_items: tax class link + master-level availability window
-- ------------------------------------------------------------
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS tax_class_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS available_days TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS available_from_time TEXT NULL,
  ADD COLUMN IF NOT EXISTS available_to_time TEXT NULL;

ALTER TABLE menu_items
  ADD CONSTRAINT fk_menu_items_tax_class
    FOREIGN KEY (tax_class_id) REFERENCES tax_classes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_menu_items_tenant_tax_class
  ON menu_items (tenant_id, tax_class_id);

-- ------------------------------------------------------------
-- 2. branch_menu_item_overrides: branch-level availability window override
-- ------------------------------------------------------------
ALTER TABLE branch_menu_item_overrides
  ADD COLUMN IF NOT EXISTS available_days TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS available_from_time TEXT NULL,
  ADD COLUMN IF NOT EXISTS available_to_time TEXT NULL;

-- ------------------------------------------------------------
-- 3. combos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS combos (
  id           TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT NULL,
  combo_price  DECIMAL(12,2) NOT NULL,
  image_key    TEXT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at   TIMESTAMP(3) NULL,
  CONSTRAINT fk_combos_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_combos_tenant ON combos (tenant_id);

-- ------------------------------------------------------------
-- 4. combo_items
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS combo_items (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  combo_id      TEXT NOT NULL,
  menu_item_id  TEXT NOT NULL,
  quantity      INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_combo_items_combo FOREIGN KEY (combo_id) REFERENCES combos(id) ON DELETE CASCADE,
  CONSTRAINT fk_combo_items_menu_item FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_combo_items_tenant ON combo_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_combo_items_combo ON combo_items (combo_id);

-- ------------------------------------------------------------
-- 5. Row-Level Security
-- ------------------------------------------------------------
ALTER TABLE combos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS combos_tenant_isolation ON combos;
CREATE POLICY combos_tenant_isolation ON combos
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS combo_items_tenant_isolation ON combo_items;
CREATE POLICY combo_items_tenant_isolation ON combo_items
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON combos, combo_items TO business_os_app;
