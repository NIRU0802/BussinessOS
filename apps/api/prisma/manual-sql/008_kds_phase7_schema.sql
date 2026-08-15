-- Phase 7: Kitchen Display System
-- Adds kitchen_tickets, kitchen_ticket_items, and branch printer settings.
-- Apply manually via psql, following the established RLS pattern.

BEGIN;

CREATE TABLE IF NOT EXISTS kitchen_tickets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           TEXT NOT NULL,
    branch_id           UUID NOT NULL REFERENCES branches(id),
    order_id            UUID NOT NULL REFERENCES orders(id),
    table_id            UUID NULL REFERENCES tables(id),
    channel             TEXT NOT NULL,
    ticket_sequence     INTEGER NOT NULL,
    status              TEXT NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new', 'preparing', 'ready', 'served')),
    is_addition         BOOLEAN NOT NULL DEFAULT false,
    printed             BOOLEAN NOT NULL DEFAULT false,
    print_error         TEXT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    ready_at            TIMESTAMPTZ NULL,
    served_at           TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_tenant_branch_status
    ON kitchen_tickets (tenant_id, branch_id, status);

CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_order
    ON kitchen_tickets (order_id);

CREATE TABLE IF NOT EXISTS kitchen_ticket_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           TEXT NOT NULL,
    kitchen_ticket_id   UUID NOT NULL REFERENCES kitchen_tickets(id) ON DELETE CASCADE,
    order_item_id       UUID NOT NULL REFERENCES order_items(id),
    menu_item_name      TEXT NOT NULL,
    quantity            INTEGER NOT NULL,
    notes               TEXT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kitchen_ticket_items_ticket
    ON kitchen_ticket_items (kitchen_ticket_id);

CREATE TABLE IF NOT EXISTS branch_kds_settings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           TEXT NOT NULL,
    branch_id           UUID NOT NULL UNIQUE REFERENCES branches(id),
    ticket_printing_enabled BOOLEAN NOT NULL DEFAULT false,
    printer_connection_type TEXT NULL CHECK (printer_connection_type IN ('network', 'usb', NULL)),
    printer_host        TEXT NULL,
    printer_port        INTEGER NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: standard tenant-scoped pattern (consistent with Phase 3 tables)
ALTER TABLE kitchen_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_ticket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_kds_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_kitchen_tickets ON kitchen_tickets
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_kitchen_ticket_items ON kitchen_ticket_items
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_branch_kds_settings ON branch_kds_settings
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

COMMIT;