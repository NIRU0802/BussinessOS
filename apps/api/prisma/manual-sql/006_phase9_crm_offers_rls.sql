-- ============================================================================
-- Phase 9: CRM (Customers) & Offers/Promotions — Row-Level Security
-- Tables: customers, customer_addresses, offers, offer_dispatches
-- ============================================================================

-- customers -------------------------------------------------------------
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;

CREATE POLICY customers_insert ON customers
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY customers_select ON customers
  FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY customers_update ON customers
  FOR UPDATE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY customers_delete ON customers
  FOR DELETE
  USING (tenant_id = current_tenant_id());

-- customer_addresses ------------------------------------------------------
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses FORCE ROW LEVEL SECURITY;

CREATE POLICY customer_addresses_insert ON customer_addresses
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY customer_addresses_select ON customer_addresses
  FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY customer_addresses_update ON customer_addresses
  FOR UPDATE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY customer_addresses_delete ON customer_addresses
  FOR DELETE
  USING (tenant_id = current_tenant_id());

-- offers --------------------------------------------------------------------
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers FORCE ROW LEVEL SECURITY;

CREATE POLICY offers_insert ON offers
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY offers_select ON offers
  FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY offers_update ON offers
  FOR UPDATE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY offers_delete ON offers
  FOR DELETE
  USING (tenant_id = current_tenant_id());

-- offer_dispatches ------------------------------------------------------
ALTER TABLE offer_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_dispatches FORCE ROW LEVEL SECURITY;

CREATE POLICY offer_dispatches_insert ON offer_dispatches
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY offer_dispatches_select ON offer_dispatches
  FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY offer_dispatches_update ON offer_dispatches
  FOR UPDATE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY offer_dispatches_delete ON offer_dispatches
  FOR DELETE
  USING (tenant_id = current_tenant_id());