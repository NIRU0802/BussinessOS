-- ============================================================================
-- RLS for Phase 2: Menu & Catalog Engine
-- Applies the same tenant_id-based isolation pattern as 001_enable_rls.sql.
-- Run this AFTER `prisma migrate dev --name menu_catalog_engine` has
-- successfully created these tables.
-- ============================================================================

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'menu_categories',
    'menu_items',
    'menu_item_variants',
    'modifier_groups',
    'modifier_options',
    'menu_item_modifier_groups',
    'branch_menu_item_overrides'
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

-- Grant privileges to the app role (RLS still restricts rows).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO business_os_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO business_os_app;