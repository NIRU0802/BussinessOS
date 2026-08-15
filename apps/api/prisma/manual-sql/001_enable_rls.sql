-- ============================================================================
-- ROW-LEVEL SECURITY POLICIES
-- Note: Prisma's String @id @default(uuid()) fields are stored as TEXT
-- columns in Postgres (not native uuid type), so this helper returns TEXT
-- to match tenant_id column types exactly.
--
-- IMPORTANT — BOOTSTRAP NOTE:
-- current_tenant_id() will raise an error if app.current_tenant_id has not
-- been set for the session/transaction (missing_ok = false). This is
-- intentional fail-closed behavior. It means:
--   1. Every request-handling transaction MUST call
--      SET LOCAL app.current_tenant_id = '<tenant-id>' before touching any
--      tenant-scoped table (this is what the tenant middleware/interceptor
--      from Phase 1 is responsible for).
--   2. When creating a brand-new tenant, the app must generate the tenant's
--      id first, then SET LOCAL app.current_tenant_id to that same id
--      BEFORE inserting the tenant row, so the WITH CHECK on
--      tenants_insert_isolation passes.
--   3. Seed / migration scripts that need to write across tenants (e.g.
--      seeding the global `permissions` catalog) should run as a separate
--      DB role with BYPASSRLS, never as the `business_os_app` role.
-- ============================================================================

CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS TEXT AS $$
  SELECT current_setting('app.current_tenant_id', false);
$$ LANGUAGE SQL STABLE;

-- ---------------------------------------------------------------------------
-- tenants
-- ---------------------------------------------------------------------------
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenants_select_public ON tenants;
DROP POLICY IF EXISTS tenants_insert_isolation ON tenants;
DROP POLICY IF EXISTS tenants_update_isolation ON tenants;
DROP POLICY IF EXISTS tenants_delete_isolation ON tenants;

-- Tenant name/slug are needed for pre-auth login lookups (resolving which
-- tenant a user belongs to before any tenant context can exist), so SELECT
-- is intentionally public. Writes remain strictly tenant-scoped.
CREATE POLICY tenants_select_public ON tenants
  FOR SELECT USING (true);

CREATE POLICY tenants_insert_isolation ON tenants
  FOR INSERT WITH CHECK (id = current_tenant_id());

CREATE POLICY tenants_update_isolation ON tenants
  FOR UPDATE USING (id = current_tenant_id()) WITH CHECK (id = current_tenant_id());

CREATE POLICY tenants_delete_isolation ON tenants
  FOR DELETE USING (id = current_tenant_id());

-- ---------------------------------------------------------------------------
-- Applied to every tenant_id-scoped table.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'branches',
    'users',
    'user_branches',
    'roles',
    'user_roles',
    'devices',
    'refresh_tokens',
    'audit_logs'
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
-- role_permissions has no tenant_id directly — scope via its parent role.
-- Note: this subquery is itself subject to tenant_isolation_roles, so the
-- scoping is applied twice (defense in depth), not redundantly bypassed.
-- ---------------------------------------------------------------------------
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_role_permissions ON role_permissions;
CREATE POLICY tenant_isolation_role_permissions ON role_permissions
  USING (
    role_id IN (SELECT id FROM roles WHERE tenant_id = current_tenant_id())
  )
  WITH CHECK (
    role_id IN (SELECT id FROM roles WHERE tenant_id = current_tenant_id())
  );

-- ---------------------------------------------------------------------------
-- permissions is a GLOBAL catalog table (not tenant-scoped).
-- Only a SELECT policy is defined — writes are denied to all roles by
-- default under RLS. This table should only ever be written to by a
-- migration/seed role with BYPASSRLS, never by business_os_app.
-- ---------------------------------------------------------------------------
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS permissions_read_all ON permissions;
CREATE POLICY permissions_read_all ON permissions FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- Grant table privileges to the app role (RLS still restricts rows).
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO business_os_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO business_os_app;