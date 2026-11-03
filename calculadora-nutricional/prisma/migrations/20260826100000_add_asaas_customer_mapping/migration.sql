-- Etapa 05: adapter Asaas e customer mapping com lease local. A mudança é
-- aditiva e mantém os mappings históricos Stripe como ativos.
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'ASAAS';

CREATE TYPE "BillingCustomerStatus" AS ENUM ('PENDING', 'ACTIVE', 'SYNC_ERROR');

ALTER TABLE "BillingCustomer"
  ALTER COLUMN "providerCustomerId" DROP NOT NULL,
  ADD COLUMN "externalReference" TEXT,
  ADD COLUMN "status" "BillingCustomerStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "syncLeaseId" TEXT,
  ADD COLUMN "syncLeaseExpiresAt" TIMESTAMP(3),
  ADD COLUMN "lastSyncedAt" TIMESTAMP(3),
  ADD COLUMN "lastErrorCode" TEXT;

UPDATE "BillingCustomer"
SET "status" = 'ACTIVE',
    "lastSyncedAt" = COALESCE("updatedAt", "createdAt")
WHERE "providerCustomerId" IS NOT NULL;

CREATE UNIQUE INDEX "BillingCustomer_syncLeaseId_key"
  ON "BillingCustomer"("syncLeaseId");
CREATE INDEX "BillingCustomer_provider_status_idx"
  ON "BillingCustomer"("provider", "status");
CREATE INDEX "BillingCustomer_syncLeaseExpiresAt_idx"
  ON "BillingCustomer"("syncLeaseExpiresAt");
