-- CreateEnum
CREATE TYPE "OrderChannel" AS ENUM ('pos', 'qr', 'delivery_zomato', 'delivery_swiggy', 'delivery_ubereats', 'whatsapp', 'phone');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('open', 'held', 'paid', 'voided', 'refunded', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'card', 'upi', 'other');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "VoidRefundType" AS ENUM ('void', 'refund');

-- CreateEnum
CREATE TYPE "VoidRefundStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "SyncConflictStatus" AS ENUM ('pending', 'resolved');

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "table_id" TEXT,
    "device_id" TEXT NOT NULL,
    "client_generated_id" TEXT NOT NULL,
    "channel" "OrderChannel" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'open',
    "subtotal" DECIMAL(14,2) NOT NULL,
    "tax_amount" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "sync_version" INTEGER NOT NULL DEFAULT 1,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "modifiers" JSONB,
    "batch_number" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "paid_by_customer_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "void_refund_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "type" "VoidRefundType" NOT NULL,
    "requested_by" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "VoidRefundStatus" NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "void_refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_conflicts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "table_id" TEXT NOT NULL,
    "order_a_id" TEXT NOT NULL,
    "order_b_id" TEXT NOT NULL,
    "status" "SyncConflictStatus" NOT NULL DEFAULT 'pending',
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_cashier_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quick_cashier_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_pins" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "pin_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_client_generated_id_key" ON "orders"("client_generated_id");

-- CreateIndex
CREATE INDEX "orders_tenant_id_branch_id_idx" ON "orders"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "orders_tenant_id_branch_id_table_id_idx" ON "orders"("tenant_id", "branch_id", "table_id");

-- CreateIndex
CREATE INDEX "orders_tenant_id_branch_id_channel_idx" ON "orders"("tenant_id", "branch_id", "channel");

-- CreateIndex
CREATE INDEX "orders_tenant_id_branch_id_status_idx" ON "orders"("tenant_id", "branch_id", "status");

-- CreateIndex
CREATE INDEX "orders_tenant_id_created_at_idx" ON "orders"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "order_items_tenant_id_order_id_idx" ON "order_items"("tenant_id", "order_id");

-- CreateIndex
CREATE INDEX "order_payments_tenant_id_order_id_idx" ON "order_payments"("tenant_id", "order_id");

-- CreateIndex
CREATE INDEX "void_refund_requests_tenant_id_order_id_idx" ON "void_refund_requests"("tenant_id", "order_id");

-- CreateIndex
CREATE INDEX "void_refund_requests_tenant_id_status_idx" ON "void_refund_requests"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sync_conflicts_tenant_id_branch_id_idx" ON "sync_conflicts"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "sync_conflicts_tenant_id_status_idx" ON "sync_conflicts"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "quick_cashier_settings_tenant_id_branch_id_key" ON "quick_cashier_settings"("tenant_id", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_pins_tenant_id_user_id_key" ON "user_pins"("tenant_id", "user_id");

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "void_refund_requests" ADD CONSTRAINT "void_refund_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_conflicts" ADD CONSTRAINT "sync_conflicts_order_a_id_fkey" FOREIGN KEY ("order_a_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_conflicts" ADD CONSTRAINT "sync_conflicts_order_b_id_fkey" FOREIGN KEY ("order_b_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
