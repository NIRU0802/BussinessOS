-- Phase 11: Expenses & Accounting — Row-Level Security
-- Rename this file to match the next sequential number in manual-sql/

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- expense_categories: standard tenant isolation
CREATE POLICY expense_categories_tenant_isolation ON expense_categories
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- expenses: standard tenant isolation
CREATE POLICY expenses_tenant_isolation ON expenses
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());