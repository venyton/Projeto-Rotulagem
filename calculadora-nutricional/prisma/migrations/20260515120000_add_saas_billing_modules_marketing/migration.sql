CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'BILLING', 'MEMBER');
CREATE TYPE "SaaSModuleKey" AS ENUM ('TABLES', 'CUSTOM_INGREDIENTS', 'TECHNICAL_SHEETS', 'OPEN_FOOD_FACTS', 'ENTERPRISE_LABELS', 'EXPORTS', 'AI_IMPORT', 'MARKETING_ANALYTICS', 'API_ACCESS', 'BILLING');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'UNPAID', 'PAUSED');
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'MANUAL');
CREATE TYPE "BillingWebhookStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED');
CREATE TYPE "MarketingEventType" AS ENUM ('SIGNUP_STARTED', 'SIGNUP_COMPLETED', 'CHECKOUT_STARTED', 'CHECKOUT_COMPLETED', 'CHECKOUT_ABANDONED', 'LOGIN', 'MODULE_USED', 'LEAD_CAPTURED');

ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPriceCents" INTEGER NOT NULL DEFAULT 0,
    "yearlyPriceCents" INTEGER NOT NULL DEFAULT 0,
    "stripeMonthlyPriceId" TEXT,
    "stripeYearlyPriceId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlanModule" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "moduleKey" "SaaSModuleKey" NOT NULL,
    "usageLimit" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanModule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationEntitlement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "moduleKey" "SaaSModuleKey" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "usageLimit" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationEntitlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParticipantModuleGrant" (
    "id" TEXT NOT NULL,
    "organizationMemberId" TEXT NOT NULL,
    "moduleKey" "SaaSModuleKey" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "usageLimit" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipantModuleGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingCustomer" (
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

CREATE TABLE "Subscription" (
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

CREATE TABLE "BillingWebhookEvent" (
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

CREATE TABLE "MarketingKeyword" (
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

CREATE TABLE "MarketingEvent" (
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

CREATE TABLE "SecurityAuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL DEFAULT 'INFO',
    "ipHash" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Organization_ownerId_idx" ON "Organization"("ownerId");
CREATE INDEX "Organization_status_idx" ON "Organization"("status");

CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");
CREATE INDEX "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");
CREATE INDEX "OrganizationMember_role_idx" ON "OrganizationMember"("role");

CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");
CREATE INDEX "Plan_active_idx" ON "Plan"("active");

CREATE UNIQUE INDEX "PlanModule_planId_moduleKey_key" ON "PlanModule"("planId", "moduleKey");
CREATE INDEX "PlanModule_moduleKey_idx" ON "PlanModule"("moduleKey");

CREATE UNIQUE INDEX "OrganizationEntitlement_organizationId_moduleKey_key" ON "OrganizationEntitlement"("organizationId", "moduleKey");
CREATE INDEX "OrganizationEntitlement_moduleKey_idx" ON "OrganizationEntitlement"("moduleKey");
CREATE INDEX "OrganizationEntitlement_enabled_idx" ON "OrganizationEntitlement"("enabled");

CREATE UNIQUE INDEX "ParticipantModuleGrant_organizationMemberId_moduleKey_key" ON "ParticipantModuleGrant"("organizationMemberId", "moduleKey");
CREATE INDEX "ParticipantModuleGrant_moduleKey_idx" ON "ParticipantModuleGrant"("moduleKey");
CREATE INDEX "ParticipantModuleGrant_enabled_idx" ON "ParticipantModuleGrant"("enabled");

CREATE UNIQUE INDEX "BillingCustomer_providerCustomerId_key" ON "BillingCustomer"("providerCustomerId");
CREATE UNIQUE INDEX "BillingCustomer_organizationId_provider_key" ON "BillingCustomer"("organizationId", "provider");
CREATE INDEX "BillingCustomer_userId_idx" ON "BillingCustomer"("userId");
CREATE INDEX "BillingCustomer_provider_idx" ON "BillingCustomer"("provider");

CREATE UNIQUE INDEX "Subscription_providerSubscriptionId_key" ON "Subscription"("providerSubscriptionId");
CREATE INDEX "Subscription_organizationId_idx" ON "Subscription"("organizationId");
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

CREATE UNIQUE INDEX "BillingWebhookEvent_providerEventId_key" ON "BillingWebhookEvent"("providerEventId");
CREATE INDEX "BillingWebhookEvent_provider_idx" ON "BillingWebhookEvent"("provider");
CREATE INDEX "BillingWebhookEvent_type_idx" ON "BillingWebhookEvent"("type");
CREATE INDEX "BillingWebhookEvent_status_idx" ON "BillingWebhookEvent"("status");

CREATE UNIQUE INDEX "MarketingKeyword_organizationId_keyword_source_medium_campaign_key" ON "MarketingKeyword"("organizationId", "keyword", "source", "medium", "campaign");
CREATE INDEX "MarketingKeyword_organizationId_idx" ON "MarketingKeyword"("organizationId");
CREATE INDEX "MarketingKeyword_keyword_idx" ON "MarketingKeyword"("keyword");
CREATE INDEX "MarketingKeyword_active_idx" ON "MarketingKeyword"("active");

CREATE INDEX "MarketingEvent_organizationId_idx" ON "MarketingEvent"("organizationId");
CREATE INDEX "MarketingEvent_organizationMemberId_idx" ON "MarketingEvent"("organizationMemberId");
CREATE INDEX "MarketingEvent_userId_idx" ON "MarketingEvent"("userId");
CREATE INDEX "MarketingEvent_keywordId_idx" ON "MarketingEvent"("keywordId");
CREATE INDEX "MarketingEvent_eventType_idx" ON "MarketingEvent"("eventType");
CREATE INDEX "MarketingEvent_moduleKey_idx" ON "MarketingEvent"("moduleKey");
CREATE INDEX "MarketingEvent_occurredAt_idx" ON "MarketingEvent"("occurredAt");

CREATE INDEX "SecurityAuditLog_organizationId_idx" ON "SecurityAuditLog"("organizationId");
CREATE INDEX "SecurityAuditLog_userId_idx" ON "SecurityAuditLog"("userId");
CREATE INDEX "SecurityAuditLog_action_idx" ON "SecurityAuditLog"("action");
CREATE INDEX "SecurityAuditLog_riskLevel_idx" ON "SecurityAuditLog"("riskLevel");
CREATE INDEX "SecurityAuditLog_createdAt_idx" ON "SecurityAuditLog"("createdAt");

CREATE UNIQUE INDEX "RateLimitBucket_scope_keyHash_key" ON "RateLimitBucket"("scope", "keyHash");
CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");

ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanModule" ADD CONSTRAINT "PlanModule_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationEntitlement" ADD CONSTRAINT "OrganizationEntitlement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParticipantModuleGrant" ADD CONSTRAINT "ParticipantModuleGrant_organizationMemberId_fkey" FOREIGN KEY ("organizationMemberId") REFERENCES "OrganizationMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingCustomer" ADD CONSTRAINT "BillingCustomer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingCustomer" ADD CONSTRAINT "BillingCustomer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketingKeyword" ADD CONSTRAINT "MarketingKeyword_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingEvent" ADD CONSTRAINT "MarketingEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketingEvent" ADD CONSTRAINT "MarketingEvent_organizationMemberId_fkey" FOREIGN KEY ("organizationMemberId") REFERENCES "OrganizationMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketingEvent" ADD CONSTRAINT "MarketingEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketingEvent" ADD CONSTRAINT "MarketingEvent_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "MarketingKeyword"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SecurityAuditLog" ADD CONSTRAINT "SecurityAuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SecurityAuditLog" ADD CONSTRAINT "SecurityAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
