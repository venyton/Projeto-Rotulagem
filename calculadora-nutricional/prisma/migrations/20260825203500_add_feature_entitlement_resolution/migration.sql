CREATE TYPE "EntitlementOverrideMode" AS ENUM ('ENABLE', 'DISABLE', 'SET_LIMIT');

ALTER TABLE "Organization"
  ADD COLUMN "entitlementPolicyVersion" INTEGER NOT NULL DEFAULT 2;

UPDATE "Organization" SET "entitlementPolicyVersion" = 1;

CREATE TABLE "OrganizationFeatureGrant" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "featureDefinitionId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "limitValue" INTEGER,
  "source" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrganizationFeatureGrant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrganizationFeatureGrant_limitValue_check" CHECK ("limitValue" IS NULL OR "limitValue" >= 0),
  CONSTRAINT "OrganizationFeatureGrant_validity_check" CHECK ("expiresAt" IS NULL OR "expiresAt" > "startsAt")
);

CREATE TABLE "OrganizationFeatureOverride" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "featureDefinitionId" TEXT NOT NULL,
  "mode" "EntitlementOverrideMode" NOT NULL,
  "limitValue" INTEGER,
  "reason" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrganizationFeatureOverride_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrganizationFeatureOverride_limitValue_check" CHECK ("limitValue" IS NULL OR "limitValue" >= 0),
  CONSTRAINT "OrganizationFeatureOverride_validity_check" CHECK ("expiresAt" IS NULL OR "expiresAt" > "startsAt"),
  CONSTRAINT "OrganizationFeatureOverride_mode_limit_check" CHECK (
    ("mode" = 'SET_LIMIT' AND "limitValue" IS NOT NULL)
    OR ("mode" <> 'SET_LIMIT' AND "limitValue" IS NULL)
  )
);

CREATE INDEX "Organization_entitlementPolicyVersion_idx" ON "Organization"("entitlementPolicyVersion");
CREATE INDEX "OrgFeatureGrant_org_feature_validity_idx"
  ON "OrganizationFeatureGrant"("organizationId", "featureDefinitionId", "startsAt", "expiresAt");
CREATE INDEX "OrgFeatureGrant_feature_validity_idx"
  ON "OrganizationFeatureGrant"("featureDefinitionId", "startsAt", "expiresAt");
CREATE INDEX "OrganizationFeatureGrant_createdByUserId_idx" ON "OrganizationFeatureGrant"("createdByUserId");
CREATE INDEX "OrgFeatureOverride_org_feature_validity_idx"
  ON "OrganizationFeatureOverride"("organizationId", "featureDefinitionId", "startsAt", "expiresAt");
CREATE INDEX "OrgFeatureOverride_feature_validity_idx"
  ON "OrganizationFeatureOverride"("featureDefinitionId", "startsAt", "expiresAt");
CREATE INDEX "OrganizationFeatureOverride_createdByUserId_idx" ON "OrganizationFeatureOverride"("createdByUserId");

ALTER TABLE "OrganizationFeatureGrant"
  ADD CONSTRAINT "OrganizationFeatureGrant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "OrganizationFeatureGrant_featureDefinitionId_fkey" FOREIGN KEY ("featureDefinitionId") REFERENCES "FeatureDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "OrganizationFeatureGrant_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrganizationFeatureOverride"
  ADD CONSTRAINT "OrganizationFeatureOverride_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "OrganizationFeatureOverride_featureDefinitionId_fkey" FOREIGN KEY ("featureDefinitionId") REFERENCES "FeatureDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "OrganizationFeatureOverride_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
