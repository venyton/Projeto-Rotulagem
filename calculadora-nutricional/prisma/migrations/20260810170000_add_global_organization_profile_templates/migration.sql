-- Additive profile templates. Existing organization profiles remain untouched;
-- a template is only materialized into an organization when explicitly created.

ALTER TABLE "OrganizationProfile"
  ADD COLUMN IF NOT EXISTS "globalTemplateId" TEXT;

CREATE TABLE IF NOT EXISTS "GlobalOrganizationProfile" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GlobalOrganizationProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GlobalOrganizationProfilePermission" (
  "id" TEXT NOT NULL,
  "globalProfileId" TEXT NOT NULL,
  "moduleKey" "SaaSModuleKey" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GlobalOrganizationProfilePermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GlobalOrganizationProfile_name_key"
  ON "GlobalOrganizationProfile"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "GlobalOrganizationProfilePermission_globalProfileId_moduleKey_key"
  ON "GlobalOrganizationProfilePermission"("globalProfileId", "moduleKey");
CREATE INDEX IF NOT EXISTS "GlobalOrganizationProfilePermission_moduleKey_idx"
  ON "GlobalOrganizationProfilePermission"("moduleKey");
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationProfile_organizationId_globalTemplateId_key"
  ON "OrganizationProfile"("organizationId", "globalTemplateId");
CREATE INDEX IF NOT EXISTS "OrganizationProfile_globalTemplateId_idx"
  ON "OrganizationProfile"("globalTemplateId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrganizationProfile_globalTemplateId_fkey'
  ) THEN
    ALTER TABLE "OrganizationProfile"
      ADD CONSTRAINT "OrganizationProfile_globalTemplateId_fkey"
      FOREIGN KEY ("globalTemplateId") REFERENCES "GlobalOrganizationProfile"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'GlobalOrganizationProfilePermission_globalProfileId_fkey'
  ) THEN
    ALTER TABLE "GlobalOrganizationProfilePermission"
      ADD CONSTRAINT "GlobalOrganizationProfilePermission_globalProfileId_fkey"
      FOREIGN KEY ("globalProfileId") REFERENCES "GlobalOrganizationProfile"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
