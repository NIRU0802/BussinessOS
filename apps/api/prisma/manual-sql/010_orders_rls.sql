-- RLS for Phase 4 tables. All are tenant-scoped (not split like `tenants`).

DROP POLICY IF EXISTS tenant_isolation_orders ON orders;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_orders ON orders
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_order_items ON order_items;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_order_items ON order_items
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_order_payments ON order_payments;
ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_payments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_order_payments ON order_payments
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_void_refund_requests ON void_refund_requests;
ALTER TABLE void_refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE void_refund_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_void_refund_requests ON void_refund_requests
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_sync_conflicts ON sync_conflicts;
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflicts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_sync_conflicts ON sync_conflicts
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_quick_cashier_settings ON quick_cashier_settings;
ALTER TABLE quick_cashier_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_cashier_settings FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_quick_cashier_settings ON quick_cashier_settings
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_user_pins ON user_pins;
ALTER TABLE user_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_pins FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_user_pins ON user_pins
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));
