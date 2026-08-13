-- Enable RLS on tenant_widgets (feature_widgets is a global catalog, no RLS needed)
ALTER TABLE tenant_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_widgets FORCE ROW LEVEL SECURITY;

-- Uses the same current_tenant_id() TEXT-returning function created in Phase 1.
-- Do NOT recreate it here if it already exists.

DROP POLICY IF EXISTS tenant_isolation_tenant_widgets ON tenant_widgets;

CREATE POLICY tenant_isolation_tenant_widgets ON tenant_widgets
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));