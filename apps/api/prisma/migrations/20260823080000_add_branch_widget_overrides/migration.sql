-- CreateTable
CREATE TABLE "branch_widget_overrides" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "widget_key" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_widget_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "branch_widget_overrides_branch_id_widget_key_key" ON "branch_widget_overrides"("branch_id", "widget_key");

-- CreateIndex
CREATE INDEX "branch_widget_overrides_tenant_id_idx" ON "branch_widget_overrides"("tenant_id");

-- CreateIndex
CREATE INDEX "branch_widget_overrides_branch_id_idx" ON "branch_widget_overrides"("branch_id");