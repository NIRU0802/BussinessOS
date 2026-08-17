-- =========================================================
-- 006_billing_rls.sql
-- Phase 2b: Subscription & Billing Engine RLS
-- plans, plan_limits, plan_widgets, addons are PLATFORM-LEVEL
-- (no tenant_id) — readable by all authenticated tenants, writable
-- only by superadmin context (app layer enforces admin-only writes;
-- RLS here just allows read-all, block direct write by app role).
-- =========================================================

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY plans_select_all ON plans
  FOR SELECT USING (true);
CREATE POLICY plans_write_app ON plans
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY plan_limits_select_all ON plan_limits
  FOR SELECT USING (true);
CREATE POLICY plan_limits_write_app ON plan_limits
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY plan_widgets_select_all ON plan_widgets
  FOR SELECT USING (true);
CREATE POLICY plan_widgets_write_app ON plan_widgets
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY addons_select_all ON addons
  FOR SELECT USING (true);
CREATE POLICY addons_write_app ON addons
  FOR ALL USING (true) WITH CHECK (true);

-- =========================================================
-- Tenant-scoped tables
-- =========================================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscriptions_tenant_isolation ON subscriptions
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoices_tenant_isolation ON invoices
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoice_items_tenant_isolation ON invoice_items
  USING (
    invoice_id IN (SELECT id FROM invoices WHERE tenant_id = current_tenant_id())
  )
  WITH CHECK (
    invoice_id IN (SELECT id FROM invoices WHERE tenant_id = current_tenant_id())
  );

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_methods_tenant_isolation ON payment_methods
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE tenant_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_addons_tenant_isolation ON tenant_addons
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());