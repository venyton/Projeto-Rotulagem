CREATE TYPE "CommercialCouponStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE "CommercialDiscountType" AS ENUM ('PERCENT', 'FIXED');
CREATE TYPE "CommercialGrantSourceType" AS ENUM ('COURTESY', 'PARTNER', 'SUPPORT', 'MIGRATION', 'OTHER');

CREATE TABLE "CommercialCoupon" (
  "id" TEXT NOT NULL,
  "codeNormalized" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "discountType" "CommercialDiscountType" NOT NULL,
  "discountValue" INTEGER NOT NULL,
  "currency" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "maxRedemptions" INTEGER,
  "maxRedemptionsPerOrganization" INTEGER NOT NULL DEFAULT 1,
  "status" "CommercialCouponStatus" NOT NULL DEFAULT 'DRAFT',
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialCoupon_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialCoupon_value_check" CHECK (
    ("discountType" = 'PERCENT' AND "discountValue" BETWEEN 1 AND 9900 AND "currency" IS NULL)
    OR ("discountType" = 'FIXED' AND "discountValue" > 0 AND "currency" = 'BRL')
  ),
  CONSTRAINT "CommercialCoupon_validity_check" CHECK ("endsAt" > "startsAt"),
  CONSTRAINT "CommercialCoupon_usage_check" CHECK (
    ("maxRedemptions" IS NULL OR "maxRedemptions" > 0)
    AND "maxRedemptionsPerOrganization" > 0
  )
);

CREATE TABLE "CommercialCouponPlan" (
  "couponId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  CONSTRAINT "CommercialCouponPlan_pkey" PRIMARY KEY ("couponId", "planId")
);

CREATE TABLE "CouponRedemption" (
  "id" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "originalAmountMinor" INTEGER NOT NULL,
  "appliedDiscountMinor" INTEGER NOT NULL,
  "finalAmountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CouponRedemption_amounts_check" CHECK (
    "originalAmountMinor" > 0
    AND "appliedDiscountMinor" > 0
    AND "finalAmountMinor" > 0
    AND "originalAmountMinor" = "appliedDiscountMinor" + "finalAmountMinor"
  )
);

CREATE TABLE "CommercialGrant" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "sourceType" "CommercialGrantSourceType" NOT NULL,
  "reason" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "revokedByUserId" TEXT,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialGrant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialGrant_validity_check" CHECK ("expiresAt" IS NULL OR "expiresAt" > "startsAt")
);

CREATE TABLE "CommercialGrantFeature" (
  "grantId" TEXT NOT NULL,
  "featureDefinitionId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "limitValue" INTEGER,
  CONSTRAINT "CommercialGrantFeature_pkey" PRIMARY KEY ("grantId", "featureDefinitionId"),
  CONSTRAINT "CommercialGrantFeature_limit_check" CHECK ("limitValue" IS NULL OR "limitValue" >= 0)
);

ALTER TABLE "BillingCheckoutAttempt" ADD COLUMN "amountMinorSnapshot" INTEGER;
ALTER TABLE "BillingCheckoutAttempt" ADD COLUMN "couponRedemptionId" TEXT;
UPDATE "BillingCheckoutAttempt" AS attempt
SET "amountMinorSnapshot" = price."amountMinor"
FROM "BillingPrice" AS price
WHERE price."id" = attempt."billingPriceId";
ALTER TABLE "BillingCheckoutAttempt" ALTER COLUMN "amountMinorSnapshot" SET NOT NULL;
ALTER TABLE "BillingCheckoutAttempt" ADD CONSTRAINT "BillingCheckoutAttempt_amount_check" CHECK ("amountMinorSnapshot" > 0);

CREATE UNIQUE INDEX "CommercialCoupon_codeNormalized_key" ON "CommercialCoupon"("codeNormalized");
CREATE INDEX "CommercialCoupon_status_validity_idx" ON "CommercialCoupon"("status", "startsAt", "endsAt");
CREATE INDEX "CommercialCoupon_createdByUserId_idx" ON "CommercialCoupon"("createdByUserId");
CREATE INDEX "CommercialCouponPlan_planId_idx" ON "CommercialCouponPlan"("planId");
CREATE UNIQUE INDEX "CouponRedemption_subscriptionId_key" ON "CouponRedemption"("subscriptionId");
CREATE UNIQUE INDEX "CouponRedemption_coupon_org_subscription_key" ON "CouponRedemption"("couponId", "organizationId", "subscriptionId");
CREATE INDEX "CouponRedemption_coupon_revoked_redeemed_idx" ON "CouponRedemption"("couponId", "revokedAt", "redeemedAt");
CREATE INDEX "CouponRedemption_org_coupon_revoked_idx" ON "CouponRedemption"("organizationId", "couponId", "revokedAt");
CREATE INDEX "CommercialGrant_org_validity_revoked_idx" ON "CommercialGrant"("organizationId", "startsAt", "expiresAt", "revokedAt");
CREATE INDEX "CommercialGrant_createdByUserId_idx" ON "CommercialGrant"("createdByUserId");
CREATE INDEX "CommercialGrant_revokedByUserId_idx" ON "CommercialGrant"("revokedByUserId");
CREATE INDEX "CommercialGrantFeature_featureDefinitionId_idx" ON "CommercialGrantFeature"("featureDefinitionId");
CREATE UNIQUE INDEX "BillingCheckoutAttempt_couponRedemptionId_key" ON "BillingCheckoutAttempt"("couponRedemptionId");

ALTER TABLE "CommercialCoupon" ADD CONSTRAINT "CommercialCoupon_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialCouponPlan" ADD CONSTRAINT "CommercialCouponPlan_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "CommercialCoupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialCouponPlan" ADD CONSTRAINT "CommercialCouponPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "CommercialCoupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialGrant" ADD CONSTRAINT "CommercialGrant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialGrant" ADD CONSTRAINT "CommercialGrant_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialGrant" ADD CONSTRAINT "CommercialGrant_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialGrantFeature" ADD CONSTRAINT "CommercialGrantFeature_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "CommercialGrant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialGrantFeature" ADD CONSTRAINT "CommercialGrantFeature_featureDefinitionId_fkey" FOREIGN KEY ("featureDefinitionId") REFERENCES "FeatureDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingCheckoutAttempt" ADD CONSTRAINT "BillingCheckoutAttempt_couponRedemptionId_fkey" FOREIGN KEY ("couponRedemptionId") REFERENCES "CouponRedemption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
