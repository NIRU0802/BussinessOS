-- Phase 6: RLS policies for tables already created by
-- 20260814091343_phase6_9_consolidate_table_qr_and_crm.
-- That migration created dining_sessions, qr_codes, qr_sessions,
-- reservations, and tables but -- being a standard Prisma migration --
-- contains no RLS. This file adds only the missing policies.

BEGIN;

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