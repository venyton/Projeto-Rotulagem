-- Etapa 06: ciclo de contratação provider-neutral. A migration é aditiva,
-- preserva subscriptions históricas e não ativa acesso por si só.
CREATE TYPE "BillingCheckoutStatus" AS ENUM (
  'CREATING',
  'ACTIVE',
  'PAID',
  'CANCELED',
  'EXPIRED',
  'FAILED',
  'OUTCOME_UNKNOWN'
);

CREATE TYPE "BillingChargeStatus" AS ENUM (
  'PENDING',
  'CONFIRMED',
  'RECEIVED',
  'OVERDUE',
  'CANCELED',
  'REFUNDED',
  'CHARGEBACK'
);

CREATE TABLE "BillingCheckoutAttempt" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "billingPriceId" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'ASAAS',
  "externalReference" TEXT NOT NULL,
  "providerCheckoutId" TEXT,
  "status" "BillingCheckoutStatus" NOT NULL DEFAULT 'CREATING',
  "providerStatus" TEXT,
  "checkoutUrl" TEXT,
  "callbackStateHash" CHAR(64) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastErrorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingCheckoutAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingCharge" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "checkoutAttemptId" TEXT,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'ASAAS',
  "providerChargeId" TEXT,
  "externalReference" TEXT NOT NULL,
  "status" "BillingChargeStatus" NOT NULL DEFAULT 'PENDING',
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "dueDate" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "lastSyncedAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingCharge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingCharge_amountMinor_positive" CHECK ("amountMinor" > 0),
  CONSTRAINT "BillingCharge_currency_iso" CHECK ("currency" ~ '^[A-Z]{3}$')
);

CREATE UNIQUE INDEX "BillingCheckoutAttempt_externalReference_key"
  ON "BillingCheckoutAttempt"("externalReference");
CREATE UNIQUE INDEX "BillingCheckoutAttempt_providerCheckoutId_key"
  ON "BillingCheckoutAttempt"("providerCheckoutId");
CREATE INDEX "BillingCheckoutAttempt_organizationId_status_createdAt_idx"
  ON "BillingCheckoutAttempt"("organizationId", "status", "createdAt");
CREATE INDEX "BillingCheckoutAttempt_subscriptionId_idx"
  ON "BillingCheckoutAttempt"("subscriptionId");
CREATE INDEX "BillingCheckoutAttempt_billingPriceId_idx"
  ON "BillingCheckoutAttempt"("billingPriceId");
CREATE INDEX "BillingCheckoutAttempt_createdByUserId_idx"
  ON "BillingCheckoutAttempt"("createdByUserId");
CREATE INDEX "BillingCheckoutAttempt_provider_providerStatus_idx"
  ON "BillingCheckoutAttempt"("provider", "providerStatus");
CREATE INDEX "BillingCheckoutAttempt_expiresAt_idx"
  ON "BillingCheckoutAttempt"("expiresAt");

CREATE UNIQUE INDEX "BillingCharge_providerChargeId_key"
  ON "BillingCharge"("providerChargeId");
CREATE UNIQUE INDEX "BillingCharge_externalReference_key"
  ON "BillingCharge"("externalReference");
CREATE INDEX "BillingCharge_organizationId_status_createdAt_idx"
  ON "BillingCharge"("organizationId", "status", "createdAt");
CREATE INDEX "BillingCharge_subscriptionId_status_idx"
  ON "BillingCharge"("subscriptionId", "status");
CREATE INDEX "BillingCharge_checkoutAttemptId_idx"
  ON "BillingCharge"("checkoutAttemptId");
CREATE INDEX "BillingCharge_provider_status_idx"
  ON "BillingCharge"("provider", "status");
CREATE INDEX "BillingCharge_dueDate_idx"
  ON "BillingCharge"("dueDate");

ALTER TABLE "BillingCheckoutAttempt"
  ADD CONSTRAINT "BillingCheckoutAttempt_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingCheckoutAttempt"
  ADD CONSTRAINT "BillingCheckoutAttempt_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingCheckoutAttempt"
  ADD CONSTRAINT "BillingCheckoutAttempt_billingPriceId_fkey"
  FOREIGN KEY ("billingPriceId") REFERENCES "BillingPrice"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingCheckoutAttempt"
  ADD CONSTRAINT "BillingCheckoutAttempt_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BillingCharge"
  ADD CONSTRAINT "BillingCharge_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingCharge"
  ADD CONSTRAINT "BillingCharge_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingCharge"
  ADD CONSTRAINT "BillingCharge_checkoutAttemptId_fkey"
  FOREIGN KEY ("checkoutAttemptId") REFERENCES "BillingCheckoutAttempt"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
