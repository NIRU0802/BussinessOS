-- Phase 10: Reports & Analytics — recommended indexes (corrected to actual schema)
-- Apply with: docker exec -it business-os-postgres psql -U business_os_app -d business_os
-- Paste ONE statement at a time.

-- Most of these already exist from earlier phases (orders_tenant_id_branch_id_status_idx,
-- orders_tenant_id_created_at_idx, orders_tenant_id_branch_id_channel_idx) — verified via \d orders.
-- Only genuinely new indexes below.

-- Speeds up date-range + branch + status filtering together (existing indexes cover pairs,
-- not all three combined for report queries).
CREATE INDEX IF NOT EXISTS idx_orders_tenant_branch_status_created
  ON "orders" ("tenant_id", "branch_id", "status", "created_at");

-- Speeds up best-sellers aggregation joining order_items -> menu_items.
CREATE INDEX IF NOT EXISTS idx_order_items_product_id
  ON "order_items" ("product_id");

-- Speeds up per-tenant scans on order_items by created_at for date-bounded joins.
CREATE INDEX IF NOT EXISTS idx_order_items_tenant_created
  ON "order_items" ("tenant_id", "created_at");