-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "provider" "BillingProviderType",
ADD COLUMN     "provider_customer_id" TEXT,
ADD COLUMN     "provider_subscription_id" TEXT;
-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_provider_subscription_id_key" ON "subscriptions"("provider_subscription_id");
