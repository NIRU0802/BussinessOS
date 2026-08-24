-- CreateEnum
CREATE TYPE "SuperAdminType" AS ENUM ('GR8', 'TEAM');

-- CreateEnum
CREATE TYPE "SuperAdminStatus" AS ENUM ('active', 'suspended', 'disabled');

-- CreateTable
CREATE TABLE "super_admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "admin_type" "SuperAdminType" NOT NULL,
    "status" "SuperAdminStatus" NOT NULL DEFAULT 'active',
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "super_admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "super_admin_refresh_tokens" (
    "id" TEXT NOT NULL,
    "super_admin_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "super_admin_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "super_admin_audit_logs" (
    "id" TEXT NOT NULL,
    "super_admin_id" TEXT NOT NULL,
    "admin_type_at_time" "SuperAdminType" NOT NULL,
    "target_tenant_id" TEXT,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "super_admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "super_admin_users_email_key" ON "super_admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "super_admin_refresh_tokens_token_hash_key" ON "super_admin_refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "super_admin_refresh_tokens_super_admin_id_idx" ON "super_admin_refresh_tokens"("super_admin_id");

-- CreateIndex
CREATE INDEX "super_admin_audit_logs_super_admin_id_idx" ON "super_admin_audit_logs"("super_admin_id");

-- CreateIndex
CREATE INDEX "super_admin_audit_logs_target_tenant_id_idx" ON "super_admin_audit_logs"("target_tenant_id");

-- CreateIndex
CREATE INDEX "super_admin_audit_logs_action_idx" ON "super_admin_audit_logs"("action");

-- CreateIndex
CREATE INDEX "super_admin_audit_logs_created_at_idx" ON "super_admin_audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "super_admin_refresh_tokens" ADD CONSTRAINT "super_admin_refresh_tokens_super_admin_id_fkey" FOREIGN KEY ("super_admin_id") REFERENCES "super_admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "super_admin_audit_logs" ADD CONSTRAINT "super_admin_audit_logs_super_admin_id_fkey" FOREIGN KEY ("super_admin_id") REFERENCES "super_admin_users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;