-- This migration is intentionally additive. It keeps each historical userId as
-- the author while assigning all existing work to a safe organization scope.

DO $$
BEGIN
  CREATE TYPE "OrganizationKind" AS ENUM ('UNCLASSIFIED', 'INDIVIDUAL', 'COMPANY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "OrganizationInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'CANCELED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "cpfHash" TEXT,
  ADD COLUMN IF NOT EXISTS "cpfLastFour" TEXT;

ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "kind" "OrganizationKind" NOT NULL DEFAULT 'UNCLASSIFIED',
  ADD COLUMN IF NOT EXISTS "cnpjHash" TEXT,
  ADD COLUMN IF NOT EXISTS "cnpjLastFour" TEXT,
  ADD COLUMN IF NOT EXISTS "legalName" TEXT,
  ADD COLUMN IF NOT EXISTS "tradeName" TEXT;

-- Some historic imports may have a user without a membership in the workspace
-- that they own. Repair that invariant before moving any resource.
INSERT INTO "OrganizationMember" (
  "id", "organizationId", "userId", "role", "active", "createdAt", "updatedAt"
)
SELECT
  'legacy-owner-member-' || substr(md5(organization."id" || ':' || organization."ownerId"), 1, 24),
  organization."id",
  organization."ownerId",
  'OWNER'::"OrganizationRole",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Organization" organization
WHERE NOT EXISTS (
  SELECT 1
  FROM "OrganizationMember" member
  WHERE member."organizationId" = organization."id"
    AND member."userId" = organization."ownerId"
)
ON CONFLICT ("organizationId", "userId") DO NOTHING;

-- A historical user without an owned workspace but with saved work gets a
-- private legacy workspace. This prevents assigning private data to a company
-- membership merely because that user was later invited to one.
INSERT INTO "Organization" (
  "id", "ownerId", "name", "slug", "status", "kind", "createdAt", "updatedAt"
)
SELECT
  'legacy-organization-' || substr(md5(user_row."id"), 1, 24),
  user_row."id",
  COALESCE(NULLIF(user_row."name", ''), split_part(user_row."email", '@', 1), 'Workspace') || ' (legado)',
  'legado-' || substr(md5(user_row."id"), 1, 24),
  'ACTIVE'::"OrganizationStatus",
  'UNCLASSIFIED'::"OrganizationKind",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" user_row
WHERE NOT EXISTS (
  SELECT 1 FROM "Organization" organization WHERE organization."ownerId" = user_row."id"
)
AND (
  EXISTS (SELECT 1 FROM "GeneratedTable" resource WHERE resource."userId" = user_row."id")
  OR EXISTS (SELECT 1 FROM "CustomIngredient" resource WHERE resource."userId" = user_row."id")
  OR EXISTS (SELECT 1 FROM "TechnicalDocument" resource WHERE resource."userId" = user_row."id")
  OR EXISTS (SELECT 1 FROM "TechnicalSheetExtraction" resource WHERE resource."userId" = user_row."id")
  OR EXISTS (SELECT 1 FROM "EnterpriseLabelProject" resource WHERE resource."userId" = user_row."id")
)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "OrganizationMember" (
  "id", "organizationId", "userId", "role", "active", "createdAt", "updatedAt"
)
SELECT
  'legacy-owner-member-' || substr(md5(organization."id" || ':' || organization."ownerId"), 1, 24),
  organization."id",
  organization."ownerId",
  'OWNER'::"OrganizationRole",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Organization" organization
WHERE NOT EXISTS (
  SELECT 1
  FROM "OrganizationMember" member
  WHERE member."organizationId" = organization."id"
    AND member."userId" = organization."ownerId"
)
ON CONFLICT ("organizationId", "userId") DO NOTHING;

ALTER TABLE "CustomIngredient" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "GeneratedTable" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "TechnicalDocument" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "TechnicalSheetExtraction" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "EnterpriseLabelProject" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- Prefer the workspace owned by the historical author. This is deterministic
-- and preserves private data even when an author belongs to multiple tenants.
UPDATE "CustomIngredient" resource
SET "organizationId" = (
  SELECT organization."id"
  FROM "Organization" organization
  WHERE organization."ownerId" = resource."userId"
  ORDER BY organization."createdAt" ASC, organization."id" ASC
  LIMIT 1
)
WHERE resource."organizationId" IS NULL;

UPDATE "GeneratedTable" resource
SET "organizationId" = (
  SELECT organization."id"
  FROM "Organization" organization
  WHERE organization."ownerId" = resource."userId"
  ORDER BY organization."createdAt" ASC, organization."id" ASC
  LIMIT 1
)
WHERE resource."organizationId" IS NULL;

UPDATE "TechnicalDocument" resource
SET "organizationId" = (
  SELECT organization."id"
  FROM "Organization" organization
  WHERE organization."ownerId" = resource."userId"
  ORDER BY organization."createdAt" ASC, organization."id" ASC
  LIMIT 1
)
WHERE resource."organizationId" IS NULL;

UPDATE "TechnicalSheetExtraction" resource
SET "organizationId" = document."organizationId"
FROM "TechnicalDocument" document
WHERE document."id" = resource."documentId"
  AND resource."organizationId" IS NULL;

UPDATE "EnterpriseLabelProject" resource
SET "organizationId" = table_row."organizationId"
FROM "GeneratedTable" table_row
WHERE table_row."id" = resource."baseTableId"
  AND resource."organizationId" IS NULL;

UPDATE "EnterpriseLabelProject" resource
SET "organizationId" = (
  SELECT organization."id"
  FROM "Organization" organization
  WHERE organization."ownerId" = resource."userId"
  ORDER BY organization."createdAt" ASC, organization."id" ASC
  LIMIT 1
)
WHERE resource."organizationId" IS NULL;

-- Fail closed: a migration must never continue with an unscoped resource.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "CustomIngredient" WHERE "organizationId" IS NULL)
    OR EXISTS (SELECT 1 FROM "GeneratedTable" WHERE "organizationId" IS NULL)
    OR EXISTS (SELECT 1 FROM "TechnicalDocument" WHERE "organizationId" IS NULL)
    OR EXISTS (SELECT 1 FROM "TechnicalSheetExtraction" WHERE "organizationId" IS NULL)
    OR EXISTS (SELECT 1 FROM "EnterpriseLabelProject" WHERE "organizationId" IS NULL) THEN
    RAISE EXCEPTION 'Organization backfill incomplete; no resource columns were made required.';
  END IF;
END $$;

ALTER TABLE "CustomIngredient" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "GeneratedTable" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "TechnicalDocument" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "TechnicalSheetExtraction" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "EnterpriseLabelProject" ALTER COLUMN "organizationId" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "OrganizationInvitation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "profileId" TEXT,
  "invitedByUserId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "status" "OrganizationInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_cpfHash_key" ON "User"("cpfHash");
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_cnpjHash_key" ON "Organization"("cnpjHash");
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationInvitation_tokenHash_key" ON "OrganizationInvitation"("tokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationInvitation_organizationId_email_key" ON "OrganizationInvitation"("organizationId", "email");
CREATE INDEX IF NOT EXISTS "OrganizationInvitation_email_status_expiresAt_idx" ON "OrganizationInvitation"("email", "status", "expiresAt");
CREATE INDEX IF NOT EXISTS "OrganizationInvitation_organizationId_status_createdAt_idx" ON "OrganizationInvitation"("organizationId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "OrganizationInvitation_profileId_idx" ON "OrganizationInvitation"("profileId");

CREATE INDEX IF NOT EXISTS "CustomIngredient_organizationId_idx" ON "CustomIngredient"("organizationId");
CREATE INDEX IF NOT EXISTS "CustomIngredient_organizationId_createdAt_idx" ON "CustomIngredient"("organizationId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "GeneratedTable_organizationId_idx" ON "GeneratedTable"("organizationId");
CREATE INDEX IF NOT EXISTS "GeneratedTable_organizationId_createdAt_idx" ON "GeneratedTable"("organizationId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "GeneratedTable_organizationId_updatedAt_idx" ON "GeneratedTable"("organizationId", "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "TechnicalDocument_organizationId_idx" ON "TechnicalDocument"("organizationId");
CREATE INDEX IF NOT EXISTS "TechnicalDocument_organizationId_createdAt_idx" ON "TechnicalDocument"("organizationId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "TechnicalSheetExtraction_organizationId_idx" ON "TechnicalSheetExtraction"("organizationId");
CREATE INDEX IF NOT EXISTS "TechnicalSheetExtraction_organizationId_documentId_idx" ON "TechnicalSheetExtraction"("organizationId", "documentId");
CREATE INDEX IF NOT EXISTS "EnterpriseLabelProject_organizationId_idx" ON "EnterpriseLabelProject"("organizationId");
CREATE INDEX IF NOT EXISTS "EnterpriseLabelProject_organizationId_updatedAt_idx" ON "EnterpriseLabelProject"("organizationId", "updatedAt" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "EnterpriseLabelProject_organizationId_baseTableId_market_key" ON "EnterpriseLabelProject"("organizationId", "baseTableId", "market");

DROP INDEX IF EXISTS "EnterpriseLabelProject_userId_baseTableId_market_key";

ALTER TABLE "OrganizationInvitation"
  ADD CONSTRAINT "OrganizationInvitation_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationInvitation"
  ADD CONSTRAINT "OrganizationInvitation_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "OrganizationProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizationInvitation"
  ADD CONSTRAINT "OrganizationInvitation_invitedByUserId_fkey"
  FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomIngredient"
  ADD CONSTRAINT "CustomIngredient_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GeneratedTable"
  ADD CONSTRAINT "GeneratedTable_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TechnicalDocument"
  ADD CONSTRAINT "TechnicalDocument_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TechnicalSheetExtraction"
  ADD CONSTRAINT "TechnicalSheetExtraction_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EnterpriseLabelProject"
  ADD CONSTRAINT "EnterpriseLabelProject_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
