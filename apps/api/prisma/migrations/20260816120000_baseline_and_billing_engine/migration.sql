-- Baseline: Billing Engine (Plans, Subscriptions, Invoices, Addons)
-- Originally applied manually via psql; this file backfills the actual
-- schema so `prisma migrate dev` can replay history against the shadow DB.

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "BillingCycle" AS ENUM ('monthly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'issued', 'paid', 'void', 'overdue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "BillingProviderType" AS ENUM ('stripe', 'razorpay', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'cancelled', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TenantAddonStatus" AS ENUM ('active', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "billing_cycle" "BillingCycle" NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "provider_plan_id" TEXT,
    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "plan_limits" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "max_branches" INTEGER,
    "max_users" INTEGER,
    "max_devices" INTEGER,
    "max_storage_mb" INTEGER,
    "max_monthly_orders" INTEGER,
    CONSTRAINT "plan_limits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "plan_widgets" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "widget_key" TEXT NOT NULL,
    CONSTRAINT "plan_widgets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "addons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "billing_cycle" "BillingCycle" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "addons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'trialing',
    "renewal_date" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "provider" "BillingProviderType",
    "provider_customer_id" TEXT,
    "provider_subscription_id" TEXT,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "invoices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'draft',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),
    "pdf_object_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "invoice_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "payment_methods" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" "BillingProviderType" NOT NULL,
    "provider_token" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "tenant_addons" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "addon_id" TEXT NOT NULL,
    "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "TenantAddonStatus" NOT NULL DEFAULT 'active',
    CONSTRAINT "tenant_addons_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "plan_limits_plan_id_key" ON "plan_limits"("plan_id");
CREATE UNIQUE INDEX IF NOT EXISTS "plan_widgets_plan_id_widget_key_key" ON "plan_widgets"("plan_id", "widget_key");
CREATE INDEX IF NOT EXISTS "subscriptions_tenant_id_idx" ON "subscriptions"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_provider_subscription_id_key" ON "subscriptions"("provider_subscription_id");
CREATE INDEX IF NOT EXISTS "invoices_tenant_id_idx" ON "invoices"("tenant_id");
CREATE INDEX IF NOT EXISTS "payment_methods_tenant_id_idx" ON "payment_methods"("tenant_id");
CREATE INDEX IF NOT EXISTS "tenant_addons_tenant_id_idx" ON "tenant_addons"("tenant_id");

-- ---------------------------------------------------------------------
-- Foreign keys
-- ---------------------------------------------------------------------
ALTER TABLE "plan_limits" ADD CONSTRAINT "plan_limits_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plan_widgets" ADD CONSTRAINT "plan_widgets_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_addons" ADD CONSTRAINT "tenant_addons_addon_id_fkey" FOREIGN KEY ("addon_id") REFERENCES "addons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
