-- Phase 8: Inventory / Stock
-- Tables: inventory_items, stock_levels, stock_movements, product_ingredients
-- Convention: current_setting('app.current_tenant_id', true) inline,
-- DROP POLICY IF EXISTS before every CREATE POLICY, no GRANT statements
-- (grants applied globally elsewhere), tenant_id columns are TEXT.

CREATE TABLE IF NOT EXISTS inventory_items (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  name            TEXT NOT NULL,
  unit            TEXT NOT NULL,
  cost_per_unit   NUMERIC(12, 2) NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_tenant_name_key
  ON inventory_items (tenant_id, name);
CREATE INDEX IF NOT EXISTS inventory_items_tenant_idx
  ON inventory_items (tenant_id);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_items_tenant_isolation ON inventory_items;
CREATE POLICY inventory_items_tenant_isolation ON inventory_items
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));


CREATE TABLE IF NOT EXISTS stock_levels (
  id                    TEXT PRIMARY KEY,
  tenant_id             TEXT NOT NULL,
  branch_id             TEXT NOT NULL,
  inventory_item_id     TEXT NOT NULL,
  current_quantity      NUMERIC(14, 3) NOT NULL DEFAULT 0,
  low_stock_threshold   NUMERIC(14, 3) NOT NULL DEFAULT 0,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_stock_levels_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_levels_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS stock_levels_branch_item_key
  ON stock_levels (branch_id, inventory_item_id);
CREATE INDEX IF NOT EXISTS stock_levels_tenant_idx
  ON stock_levels (tenant_id);
CREATE INDEX IF NOT EXISTS stock_levels_tenant_branch_idx
  ON stock_levels (tenant_id, branch_id);

ALTER TABLE stock_levels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stock_levels_tenant_isolation ON stock_levels;
CREATE POLICY stock_levels_tenant_isolation ON stock_levels
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));


CREATE TABLE IF NOT EXISTS stock_movements (
  id                  TEXT PRIMARY KEY,
  tenant_id           TEXT NOT NULL,
  branch_id           TEXT NOT NULL,
  inventory_item_id   TEXT NOT NULL,
  change_amount       NUMERIC(14, 3) NOT NULL,
  movement_type       TEXT NOT NULL CHECK (movement_type IN ('purchase', 'sale_deduction', 'manual_adjustment', 'waste')),
  reason              TEXT,
  performed_by        TEXT,
  reference_order_id  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_stock_movements_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_movements_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS stock_movements_tenant_idx
  ON stock_movements (tenant_id);
CREATE INDEX IF NOT EXISTS stock_movements_tenant_branch_item_idx
  ON stock_movements (tenant_id, branch_id, inventory_item_id);
CREATE INDEX IF NOT EXISTS stock_movements_tenant_branch_created_idx
  ON stock_movements (tenant_id, branch_id, created_at);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stock_movements_tenant_isolation ON stock_movements;
CREATE POLICY stock_movements_tenant_isolation ON stock_movements
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));


CREATE TABLE IF NOT EXISTS product_ingredients (
  id                  TEXT PRIMARY KEY,
  tenant_id           TEXT NOT NULL,
  product_id          TEXT NOT NULL,
  inventory_item_id   TEXT NOT NULL,
  quantity_used       NUMERIC(14, 3) NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_product_ingredients_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS product_ingredients_product_item_key
  ON product_ingredients (product_id, inventory_item_id);
CREATE INDEX IF NOT EXISTS product_ingredients_tenant_idx
  ON product_ingredients (tenant_id);
CREATE INDEX IF NOT EXISTS product_ingredients_tenant_product_idx
  ON product_ingredients (tenant_id, product_id);

ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_ingredients_tenant_isolation ON product_ingredients;
CREATE POLICY product_ingredients_tenant_isolation ON product_ingredients
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));