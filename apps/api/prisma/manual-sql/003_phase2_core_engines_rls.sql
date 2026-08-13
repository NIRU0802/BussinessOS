-- ============================================================================
-- RLS for Phase 2: Core Engines (Tax, Currency, Language, Timezone,
-- Notification, Payment, Webhook)
-- Applies the same tenant_id-based isolation pattern as 001_enable_rls.sql
-- and 002_menu_rls.sql. Uses the current_tenant_id() TEXT-returning function
-- already created in 001_enable_rls.sql — do NOT recreate it here.
-- Run this AFTER `prisma migrate dev --name phase2_core_engines` has
-- successfully created these tables.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tables with a direct tenant_id column — standard isolation loop.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'tax_classes',
    'tax_rules',
    'tenant_locale_settings',
    'branch_timezone_settings',
    'notification_logs',
    'payment_records',
    'payment_refunds',
    'webhook_endpoints',
    'webhook_events'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_%1$s ON %1$s;', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_%1$s ON %1$s USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());',
      t
    );
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- webhook_delivery_attempts has no tenant_id directly — scope via its
-- parent webhook_events row, same pattern as role_permissions in
-- 001_enable_rls.sql.
-- ---------------------------------------------------------------------------
ALTER TABLE webhook_delivery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_delivery_attempts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_webhook_delivery_attempts ON webhook_delivery_attempts;
CREATE POLICY tenant_isolation_webhook_delivery_attempts ON webhook_delivery_attempts
  USING (
    webhook_event_id IN (SELECT id FROM webhook_events WHERE tenant_id = current_tenant_id())
  )
  WITH CHECK (
    webhook_event_id IN (SELECT id FROM webhook_events WHERE tenant_id = current_tenant_id())
  );

-- ---------------------------------------------------------------------------
-- Grant privileges to the app role (RLS still restricts rows).
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO business_os_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO business_os_app;