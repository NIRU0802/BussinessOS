-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('available', 'occupied', 'preparing', 'bill_requested', 'paid');

-- CreateEnum
CREATE TYPE "DiningSessionStatus" AS ENUM ('active', 'closed');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "OfferTriggerType" AS ENUM ('MANUAL', 'SCHEDULED', 'RECURRING_DATE', 'BIRTHDAY', 'INACTIVITY');

-- CreateEnum
CREATE TYPE "OfferSegment" AS ENUM ('ALL_CUSTOMERS', 'BIRTHDAY_THIS_WEEK', 'INACTIVE_30_DAYS', 'INACTIVE_60_DAYS', 'TOP_SPENDERS', 'NEW_CUSTOMERS');

-- AlterTable
ALTER TABLE "branch_menu_item_overrides" ADD COLUMN     "available_days" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "available_from_time" TEXT,
ADD COLUMN     "available_to_time" TEXT;

-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "available_days" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "available_from_time" TEXT,
ADD COLUMN     "available_to_time" TEXT,
ADD COLUMN     "tax_class_id" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "customer_id" TEXT;

-- CreateTable
CREATE TABLE "combos" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "combo_price" DECIMAL(12,2) NOT NULL,
    "image_key" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "combos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "combo_id" TEXT NOT NULL,
    "menu_item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "combo_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_codes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "table_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "table_id" TEXT NOT NULL,
    "qr_code_id" TEXT NOT NULL,
    "session_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "qr_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tables" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 2,
    "status" "TableStatus" NOT NULL DEFAULT 'available',
    "merged_into_table_id" TEXT,
    "qr_token_rotated_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dining_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "table_id" TEXT NOT NULL,
    "party_size" INTEGER,
    "status" "DiningSessionStatus" NOT NULL DEFAULT 'active',
    "opened_by" TEXT,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_by" TEXT,
    "closed_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "dining_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "table_id" TEXT,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "party_size" INTEGER NOT NULL,
    "reserved_for" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 90,
    "status" "ReservationStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "dob" DATE,
    "notes" TEXT,
    "preferences" JSONB DEFAULT '{}',
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_spent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "last_order_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Home',
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postal_code" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "title" TEXT NOT NULL,
    "message_template" TEXT NOT NULL,
    "trigger_type" "OfferTriggerType" NOT NULL,
    "segment" "OfferSegment" NOT NULL DEFAULT 'ALL_CUSTOMERS',
    "scheduled_for" TIMESTAMP(3),
    "recurring_month" INTEGER,
    "recurring_day" INTEGER,
    "inactivity_days" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_dispatches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "prepared_at" TIMESTAMP(3),
    "manager_notified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_combos_tenant" ON "combos"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_combo_items_combo" ON "combo_items"("combo_id");

-- CreateIndex
CREATE INDEX "idx_combo_items_tenant" ON "combo_items"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "qr_codes_token_hash_key" ON "qr_codes"("token_hash");

-- CreateIndex
CREATE INDEX "qr_codes_tenant_id_idx" ON "qr_codes"("tenant_id");

-- CreateIndex
CREATE INDEX "qr_codes_tenant_id_branch_id_idx" ON "qr_codes"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "qr_codes_tenant_id_table_id_idx" ON "qr_codes"("tenant_id", "table_id");

-- CreateIndex
CREATE UNIQUE INDEX "qr_sessions_session_hash_key" ON "qr_sessions"("session_hash");

-- CreateIndex
CREATE INDEX "qr_sessions_tenant_id_idx" ON "qr_sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "qr_sessions_tenant_id_branch_id_idx" ON "qr_sessions"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "qr_sessions_tenant_id_table_id_idx" ON "qr_sessions"("tenant_id", "table_id");

-- CreateIndex
CREATE INDEX "qr_sessions_tenant_id_expires_at_idx" ON "qr_sessions"("tenant_id", "expires_at");

-- CreateIndex
CREATE INDEX "tables_tenant_id_branch_id_idx" ON "tables"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "tables_tenant_id_branch_id_status_idx" ON "tables"("tenant_id", "branch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tables_branch_id_label_key" ON "tables"("branch_id", "label");

-- CreateIndex
CREATE INDEX "dining_sessions_tenant_id_branch_id_idx" ON "dining_sessions"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "dining_sessions_tenant_id_table_id_status_idx" ON "dining_sessions"("tenant_id", "table_id", "status");

-- CreateIndex
CREATE INDEX "reservations_tenant_id_branch_id_reserved_for_idx" ON "reservations"("tenant_id", "branch_id", "reserved_for");

-- CreateIndex
CREATE INDEX "reservations_tenant_id_table_id_idx" ON "reservations"("tenant_id", "table_id");

-- CreateIndex
CREATE INDEX "reservations_tenant_id_status_idx" ON "reservations"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "customers_tenant_id_idx" ON "customers"("tenant_id");

-- CreateIndex
CREATE INDEX "customers_tenant_id_dob_idx" ON "customers"("tenant_id", "dob");

-- CreateIndex
CREATE INDEX "customers_tenant_id_phone_idx" ON "customers"("tenant_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenant_id_phone_key" ON "customers"("tenant_id", "phone");

-- CreateIndex
CREATE INDEX "customer_addresses_tenant_id_idx" ON "customer_addresses"("tenant_id");

-- CreateIndex
CREATE INDEX "customer_addresses_customer_id_idx" ON "customer_addresses"("customer_id");

-- CreateIndex
CREATE INDEX "offers_tenant_id_idx" ON "offers"("tenant_id");

-- CreateIndex
CREATE INDEX "offers_tenant_id_is_active_idx" ON "offers"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "offers_tenant_id_trigger_type_idx" ON "offers"("tenant_id", "trigger_type");

-- CreateIndex
CREATE INDEX "offer_dispatches_tenant_id_idx" ON "offer_dispatches"("tenant_id");

-- CreateIndex
CREATE INDEX "offer_dispatches_offer_id_idx" ON "offer_dispatches"("offer_id");

-- CreateIndex
CREATE INDEX "offer_dispatches_customer_id_idx" ON "offer_dispatches"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "offer_dispatches_offer_id_customer_id_created_at_key" ON "offer_dispatches"("offer_id", "customer_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_menu_items_tenant_tax_class" ON "menu_items"("tenant_id", "tax_class_id");

-- CreateIndex
CREATE INDEX "orders_customer_id_idx" ON "orders"("customer_id");

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "fk_menu_items_tax_class" FOREIGN KEY ("tax_class_id") REFERENCES "tax_classes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "combos" ADD CONSTRAINT "fk_combos_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "combo_items" ADD CONSTRAINT "fk_combo_items_combo" FOREIGN KEY ("combo_id") REFERENCES "combos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "combo_items" ADD CONSTRAINT "fk_combo_items_menu_item" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_sessions" ADD CONSTRAINT "qr_sessions_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "qr_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_sessions" ADD CONSTRAINT "qr_sessions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_sessions" ADD CONSTRAINT "qr_sessions_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_merged_into_table_id_fkey" FOREIGN KEY ("merged_into_table_id") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dining_sessions" ADD CONSTRAINT "dining_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dining_sessions" ADD CONSTRAINT "dining_sessions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dining_sessions" ADD CONSTRAINT "dining_sessions_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_dispatches" ADD CONSTRAINT "offer_dispatches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_dispatches" ADD CONSTRAINT "offer_dispatches_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_dispatches" ADD CONSTRAINT "offer_dispatches_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
