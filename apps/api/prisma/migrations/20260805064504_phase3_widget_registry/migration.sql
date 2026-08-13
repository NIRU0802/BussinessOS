-- CreateEnum
CREATE TYPE "WidgetStatus" AS ENUM ('active', 'beta', 'deprecated');

-- CreateEnum
CREATE TYPE "TenantWidgetStatus" AS ENUM ('active', 'trial', 'disabled');

-- CreateTable
CREATE TABLE "feature_widgets" (
    "id" TEXT NOT NULL,
    "widget_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_optional_future_flag" BOOLEAN NOT NULL DEFAULT false,
    "status" "WidgetStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_widgets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "widget_key" TEXT NOT NULL,
    "status" "TenantWidgetStatus" NOT NULL DEFAULT 'active',
    "activated_at" TIMESTAMP(3),
    "billing_cycle" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feature_widgets_widget_key_key" ON "feature_widgets"("widget_key");

-- CreateIndex
CREATE INDEX "tenant_widgets_tenant_id_idx" ON "tenant_widgets"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_widgets_tenant_id_widget_key_key" ON "tenant_widgets"("tenant_id", "widget_key");

-- AddForeignKey
ALTER TABLE "tenant_widgets" ADD CONSTRAINT "tenant_widgets_widget_key_fkey" FOREIGN KEY ("widget_key") REFERENCES "feature_widgets"("widget_key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_widgets" ADD CONSTRAINT "tenant_widgets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
