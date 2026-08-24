-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "isEnabledGlobally" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flag_tenant_overrides" (
    "id" TEXT NOT NULL,
    "feature_flag_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flag_tenant_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flag_tenant_overrides_feature_flag_id_tenant_id_key" ON "feature_flag_tenant_overrides"("feature_flag_id", "tenant_id");

-- CreateIndex
CREATE INDEX "feature_flag_tenant_overrides_tenant_id_idx" ON "feature_flag_tenant_overrides"("tenant_id");

-- AddForeignKey
ALTER TABLE "feature_flag_tenant_overrides" ADD CONSTRAINT "feature_flag_tenant_overrides_feature_flag_id_fkey" FOREIGN KEY ("feature_flag_id") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;