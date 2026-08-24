-- ============================================================
-- Phase 11: Expenses & Accounting
-- Creates expense_categories and expenses tables with RLS.
-- Re-runnable: uses IF NOT EXISTS / DROP POLICY IF EXISTS guards.
-- IDs are generated app-side by Prisma (@default(uuid())), not
-- DB-side — no DEFAULT on id, matching existing tables.
-- ============================================================

-- expense_categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id          TEXT NOT NULL,
  tenant_id   TEXT NOT NULL,
  name        TEXT NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMP(3) NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP(3) NOT NULL,
  CONSTRAINT expense_categories_pkey PRIMARY KEY (id),
  CONSTRAINT expense_categories_tenant_id_fkey FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT expense_categories_tenant_id_name_key UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS expense_categories_tenant_id_idx
  ON expense_categories (tenant_id);

-- expenses
CREATE TABLE IF NOT EXISTS expenses (
  id                  TEXT NOT NULL,
  tenant_id           TEXT NOT NULL,
  branch_id           TEXT NOT NULL,
  category_id         TEXT NOT NULL,
  amount              DECIMAL(12,2) NOT NULL,
  description         TEXT,
  expense_date        DATE NOT NULL,
  receipt_object_key  TEXT,
  created_by          TEXT NOT NULL,
  created_at          TIMESTAMP(3) NOT NULL DEFAULT now(),
  updated_at          TIMESTAMP(3) NOT NULL,
  deleted_at          TIMESTAMP(3),
  CONSTRAINT expenses_pkey PRIMARY KEY (id),
  CONSTRAINT expenses_tenant_id_fkey FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT expenses_branch_id_fkey FOREIGN KEY (branch_id)
    REFERENCES branches(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT expenses_category_id_fkey FOREIGN KEY (category_id)
    REFERENCES expense_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- Indexes (matching schema.prisma @@index directives)
CREATE INDEX IF NOT EXISTS expenses_tenant_id_branch_id_expense_date_idx
  ON expenses (tenant_id, branch_id, expense_date);

CREATE INDEX IF NOT EXISTS expenses_tenant_id_category_id_idx
  ON expenses (tenant_id, category_id);

CREATE INDEX IF NOT EXISTS expenses_tenant_id_deleted_at_idx
  ON expenses (tenant_id, deleted_at);

-- ============================================================
-- Row-Level Security (matching inventory_items pattern exactly)
-- ============================================================

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS expense_categories_tenant_isolation ON expense_categories;
CREATE POLICY expense_categories_tenant_isolation ON expense_categories
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS expenses_tenant_isolation ON expenses;
CREATE POLICY expenses_tenant_isolation ON expenses
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));