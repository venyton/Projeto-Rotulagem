-- Etapa 07: evolui a tabela histórica em uma inbox idempotente. O payload novo
-- é uma projeção sanitizada; linhas legadas permanecem preservadas.
ALTER TYPE "BillingWebhookStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "BillingWebhookStatus" ADD VALUE IF NOT EXISTS 'IGNORED';

ALTER TABLE "BillingWebhookEvent"
  ADD COLUMN "organizationId" TEXT,
  ADD COLUMN "payloadHash" CHAR(64),
  ADD COLUMN "eventDate" TIMESTAMP(3),
  ADD COLUMN "processingAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "processingLeaseId" TEXT,
  ADD COLUMN "processingLeaseExpiresAt" TIMESTAMP(3),
  ADD COLUMN "lastErrorCode" TEXT;

CREATE UNIQUE INDEX "BillingWebhookEvent_processingLeaseId_key"
  ON "BillingWebhookEvent"("processingLeaseId");
CREATE INDEX "BillingWebhookEvent_organizationId_status_createdAt_idx"
  ON "BillingWebhookEvent"("organizationId", "status", "createdAt");
CREATE INDEX "BillingWebhookEvent_status_processingLeaseExpiresAt_createdAt_idx"
  ON "BillingWebhookEvent"("status", "processingLeaseExpiresAt", "createdAt");
CREATE INDEX "BillingWebhookEvent_eventDate_idx"
  ON "BillingWebhookEvent"("eventDate");

ALTER TABLE "BillingWebhookEvent"
  ADD CONSTRAINT "BillingWebhookEvent_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
