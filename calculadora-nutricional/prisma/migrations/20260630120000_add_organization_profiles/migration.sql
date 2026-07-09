-- CreateTable
CREATE TABLE "OrganizationProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationProfilePermission" (
    "id" TEXT NOT NULL,
    "organizationProfileId" TEXT NOT NULL,
    "moduleKey" "SaaSModuleKey" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationProfilePermission_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "OrganizationMember" ADD COLUMN "profileId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationProfile_organizationId_name_key" ON "OrganizationProfile"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationProfile_organizationId_systemKey_key" ON "OrganizationProfile"("organizationId", "systemKey");

-- CreateIndex
CREATE INDEX "OrganizationProfile_organizationId_idx" ON "OrganizationProfile"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationProfilePermission_organizationProfileId_moduleKey_key" ON "OrganizationProfilePermission"("organizationProfileId", "moduleKey");

-- CreateIndex
CREATE INDEX "OrganizationProfilePermission_moduleKey_idx" ON "OrganizationProfilePermission"("moduleKey");

-- CreateIndex
CREATE INDEX "OrganizationProfilePermission_enabled_idx" ON "OrganizationProfilePermission"("enabled");

-- CreateIndex
CREATE INDEX "OrganizationMember_profileId_idx" ON "OrganizationMember"("profileId");

-- AddForeignKey
ALTER TABLE "OrganizationProfile" ADD CONSTRAINT "OrganizationProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationProfilePermission" ADD CONSTRAINT "OrganizationProfilePermission_organizationProfileId_fkey" FOREIGN KEY ("organizationProfileId") REFERENCES "OrganizationProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "OrganizationProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill admin profile for existing workspaces.
INSERT INTO "OrganizationProfile" (
    "id",
    "organizationId",
    "name",
    "description",
    "systemKey",
    "createdAt",
    "updatedAt"
)
SELECT
    'profile_admin_' || "Organization"."id",
    "Organization"."id",
    'Administrador',
    'Acesso completo ao workspace.',
    'ADMIN',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Organization"
ON CONFLICT ("organizationId", "systemKey") DO NOTHING;

INSERT INTO "OrganizationProfilePermission" (
    "id",
    "organizationProfileId",
    "moduleKey",
    "enabled",
    "createdAt",
    "updatedAt"
)
SELECT
    'perm_admin_' || profile."organizationId" || '_' || module."moduleKey"::text,
    profile."id",
    module."moduleKey",
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "OrganizationProfile" profile
CROSS JOIN LATERAL unnest(ARRAY[
    'TABLES'::"SaaSModuleKey",
    'CUSTOM_INGREDIENTS'::"SaaSModuleKey",
    'TECHNICAL_SHEETS'::"SaaSModuleKey",
    'OPEN_FOOD_FACTS'::"SaaSModuleKey",
    'ENTERPRISE_LABELS'::"SaaSModuleKey",
    'EXPORTS'::"SaaSModuleKey",
    'AI_IMPORT'::"SaaSModuleKey",
    'API_ACCESS'::"SaaSModuleKey"
]) AS module("moduleKey")
WHERE profile."systemKey" = 'ADMIN'
ON CONFLICT ("organizationProfileId", "moduleKey") DO UPDATE SET
    "enabled" = true,
    "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "OrganizationMember" member
SET "profileId" = profile."id"
FROM "OrganizationProfile" profile
WHERE profile."organizationId" = member."organizationId"
  AND profile."systemKey" = 'ADMIN'
  AND member."profileId" IS NULL;
