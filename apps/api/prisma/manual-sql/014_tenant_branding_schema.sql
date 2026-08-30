-- 014_tenant_branding_schema.sql
-- Phase: Multi-tenant white-label branding (logo, colors, business name per tenant)

CREATE TABLE tenant_branding (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  business_name         TEXT,
  logo_url              TEXT,
  favicon_url           TEXT,
  primary_color         TEXT,
  primary_color_dark    TEXT,
  ink_color             TEXT,
  surface_color         TEXT,
  font_display          TEXT,
  receipt_footer_text   TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_branding_tenant_id ON tenant_branding(tenant_id);

ALTER TABLE tenant_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_branding_isolation ON tenant_branding
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());