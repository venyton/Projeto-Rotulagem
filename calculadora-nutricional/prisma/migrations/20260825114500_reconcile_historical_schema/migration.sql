-- Reconcilia os dois estados locais historicamente observados:
-- 1. bancos que executaram as migrations SQL desde a baseline;
-- 2. bancos locais anteriormente materializados por `prisma db push`.
--
-- A migration é estritamente aditiva: preserva objetos legados de billing e
-- marketing, completa colunas que existiam apenas no schema.prisma e não move
-- nem apaga dados.

ALTER TYPE "OrganizationRole" ADD VALUE IF NOT EXISTS 'BILLING';
ALTER TYPE "SaaSModuleKey" ADD VALUE IF NOT EXISTS 'MARKETING_ANALYTICS';
ALTER TYPE "SaaSModuleKey" ADD VALUE IF NOT EXISTS 'BILLING';

DO $$
BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'UNPAID', 'PAUSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'MANUAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "BillingWebhookStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "MarketingEventType" AS ENUM ('SIGNUP_STARTED', 'SIGNUP_COMPLETED', 'CHECKOUT_STARTED', 'CHECKOUT_COMPLETED', 'CHECKOUT_ABANDONED', 'LOGIN', 'MODULE_USED', 'LEAD_CAPTURED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "resetPasswordToken" TEXT,
  ADD COLUMN IF NOT EXISTS "resetPasswordExpiresAt" TIMESTAMP(3);

ALTER TABLE "Ingredient"
  ADD COLUMN IF NOT EXISTS "sugarAdded" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "customNutrients" JSONB;

ALTER TABLE "CustomIngredient"
  ADD COLUMN IF NOT EXISTS "customNutrients" JSONB;

ALTER TABLE "TableItem"
  ADD COLUMN IF NOT EXISTS "customNutrients" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "User_resetPasswordToken_key"
  ON "User"("resetPasswordToken");

CREATE TABLE IF NOT EXISTS "Plan" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "monthlyPriceCents" INTEGER NOT NULL DEFAULT 0,
  "quarterlyPriceCents" INTEGER NOT NULL DEFAULT 0,
  "semiannualPriceCents" INTEGER NOT NULL DEFAULT 0,
  "yearlyPriceCents" INTEGER NOT NULL DEFAULT 0,
  "stripeMonthlyPriceId" TEXT,
  "stripeQuarterlyPriceId" TEXT,
  "stripeSemiannualPriceId" TEXT,
  "stripeYearlyPriceId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PlanModule" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "moduleKey" "SaaSModuleKey" NOT NULL,
  "usageLimit" INTEGER,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlanModule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BillingCustomer" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
  "providerCustomerId" TEXT NOT NULL,
  "email" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingCustomer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "planId" TEXT,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
  "providerSubscriptionId" TEXT,
  "providerPriceId" TEXT,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "trialEndsAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BillingWebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
  "providerEventId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" "BillingWebhookStatus" NOT NULL DEFAULT 'RECEIVED',
  "payload" JSONB NOT NULL,
  "processedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MarketingKeyword" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "keyword" TEXT NOT NULL,
  "source" TEXT,
  "medium" TEXT,
  "campaign" TEXT,
  "costCents" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingKeyword_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MarketingEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "organizationMemberId" TEXT,
  "userId" TEXT,
  "keywordId" TEXT,
  "eventType" "MarketingEventType" NOT NULL,
  "moduleKey" "SaaSModuleKey",
  "anonymousId" TEXT,
  "route" TEXT,
  "source" TEXT,
  "medium" TEXT,
  "campaign" TEXT,
  "checkoutSessionId" TEXT,
  "providerCustomerId" TEXT,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Plan_code_key" ON "Plan"("code");
CREATE INDEX IF NOT EXISTS "Plan_active_idx" ON "Plan"("active");
CREATE UNIQUE INDEX IF NOT EXISTS "PlanModule_planId_moduleKey_key" ON "PlanModule"("planId", "moduleKey");
CREATE INDEX IF NOT EXISTS "PlanModule_moduleKey_idx" ON "PlanModule"("moduleKey");
CREATE UNIQUE INDEX IF NOT EXISTS "BillingCustomer_providerCustomerId_key" ON "BillingCustomer"("providerCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "BillingCustomer_organizationId_provider_key" ON "BillingCustomer"("organizationId", "provider");
CREATE INDEX IF NOT EXISTS "BillingCustomer_userId_idx" ON "BillingCustomer"("userId");
CREATE INDEX IF NOT EXISTS "BillingCustomer_provider_idx" ON "BillingCustomer"("provider");
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_providerSubscriptionId_key" ON "Subscription"("providerSubscriptionId");
CREATE INDEX IF NOT EXISTS "Subscription_organizationId_idx" ON "Subscription"("organizationId");
CREATE INDEX IF NOT EXISTS "Subscription_planId_idx" ON "Subscription"("planId");
CREATE INDEX IF NOT EXISTS "Subscription_status_idx" ON "Subscription"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "BillingWebhookEvent_providerEventId_key" ON "BillingWebhookEvent"("providerEventId");
CREATE INDEX IF NOT EXISTS "BillingWebhookEvent_provider_idx" ON "BillingWebhookEvent"("provider");
CREATE INDEX IF NOT EXISTS "BillingWebhookEvent_type_idx" ON "BillingWebhookEvent"("type");
CREATE INDEX IF NOT EXISTS "BillingWebhookEvent_status_idx" ON "BillingWebhookEvent"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingKeyword_organizationId_keyword_source_medium_campaign_key" ON "MarketingKeyword"("organizationId", "keyword", "source", "medium", "campaign");
CREATE INDEX IF NOT EXISTS "MarketingKeyword_organizationId_idx" ON "MarketingKeyword"("organizationId");
CREATE INDEX IF NOT EXISTS "MarketingKeyword_keyword_idx" ON "MarketingKeyword"("keyword");
CREATE INDEX IF NOT EXISTS "MarketingKeyword_active_idx" ON "MarketingKeyword"("active");
CREATE INDEX IF NOT EXISTS "MarketingEvent_organizationId_idx" ON "MarketingEvent"("organizationId");
CREATE INDEX IF NOT EXISTS "MarketingEvent_organizationMemberId_idx" ON "MarketingEvent"("organizationMemberId");
CREATE INDEX IF NOT EXISTS "MarketingEvent_userId_idx" ON "MarketingEvent"("userId");
CREATE INDEX IF NOT EXISTS "MarketingEvent_keywordId_idx" ON "MarketingEvent"("keywordId");
CREATE INDEX IF NOT EXISTS "MarketingEvent_eventType_idx" ON "MarketingEvent"("eventType");
CREATE INDEX IF NOT EXISTS "MarketingEvent_moduleKey_idx" ON "MarketingEvent"("moduleKey");
CREATE INDEX IF NOT EXISTS "MarketingEvent_occurredAt_idx" ON "MarketingEvent"("occurredAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlanModule_planId_fkey') THEN
    ALTER TABLE "PlanModule" ADD CONSTRAINT "PlanModule_planId_fkey"
      FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BillingCustomer_organizationId_fkey') THEN
    ALTER TABLE "BillingCustomer" ADD CONSTRAINT "BillingCustomer_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BillingCustomer_userId_fkey') THEN
    ALTER TABLE "BillingCustomer" ADD CONSTRAINT "BillingCustomer_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_organizationId_fkey') THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_planId_fkey') THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey"
      FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketingKeyword_organizationId_fkey') THEN
    ALTER TABLE "MarketingKeyword" ADD CONSTRAINT "MarketingKeyword_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketingEvent_organizationId_fkey') THEN
    ALTER TABLE "MarketingEvent" ADD CONSTRAINT "MarketingEvent_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketingEvent_organizationMemberId_fkey') THEN
    ALTER TABLE "MarketingEvent" ADD CONSTRAINT "MarketingEvent_organizationMemberId_fkey"
      FOREIGN KEY ("organizationMemberId") REFERENCES "OrganizationMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketingEvent_userId_fkey') THEN
    ALTER TABLE "MarketingEvent" ADD CONSTRAINT "MarketingEvent_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketingEvent_keywordId_fkey') THEN
    ALTER TABLE "MarketingEvent" ADD CONSTRAINT "MarketingEvent_keywordId_fkey"
      FOREIGN KEY ("keywordId") REFERENCES "MarketingKeyword"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
