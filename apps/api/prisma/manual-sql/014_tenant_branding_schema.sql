-- 014_tenant_branding_schema.sql
-- Phase 13a: Multi-tenant white-label branding (logo, colors, business name per tenant)

CREATE TABLE IF NOT EXISTS tenant_branding (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id             TEXT NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  business_name         TEXT,
  logo_object_key       TEXT,
  favicon_object_key    TEXT,
  primary_color         TEXT,
  primary_color_dark    TEXT,
  ink_color             TEXT,
  surface_color         TEXT,
  font_display          TEXT,
  receipt_footer_text   TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_branding_tenant_id ON tenant_branding(tenant_id);

ALTER TABLE tenant_branding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_branding_isolation ON tenant_branding;

CREATE POLICY tenant_branding_isolation ON tenant_branding
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));