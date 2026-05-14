CREATE TYPE "EnterpriseApprovalStatus" AS ENUM (
  'DRAFT',
  'QUALITY',
  'REGULATORY',
  'MARKETING',
  'APPROVED'
);

CREATE TYPE "EnterpriseExportType" AS ENUM (
  'PNG',
  'JSON',
  'GS1_DIGITAL_LINK'
);

CREATE TABLE "EnterpriseLabelProject" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "baseTableId" TEXT,
  "title" TEXT NOT NULL,
  "market" TEXT NOT NULL,
  "status" "EnterpriseApprovalStatus" NOT NULL DEFAULT 'DRAFT',
  "currentVersionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EnterpriseLabelProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseLabelVersion" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "baseTableId" TEXT,
  "version" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "market" TEXT NOT NULL,
  "foodState" TEXT NOT NULL,
  "approvalStatus" "EnterpriseApprovalStatus" NOT NULL DEFAULT 'DRAFT',
  "tableSnapshot" JSONB NOT NULL,
  "legalData" JSONB,
  "nutritionSnapshot" JSONB,
  "validationSnapshot" JSONB,
  "frontWarningsSnapshot" JSONB,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EnterpriseLabelVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseApproval" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "EnterpriseApprovalStatus" NOT NULL,
  "owner" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EnterpriseApproval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseExport" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "versionId" TEXT,
  "userId" TEXT NOT NULL,
  "exportType" "EnterpriseExportType" NOT NULL,
  "fileName" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EnterpriseExport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EnterpriseLabelProject_userId_baseTableId_market_key" ON "EnterpriseLabelProject"("userId", "baseTableId", "market");
CREATE INDEX "EnterpriseLabelProject_userId_idx" ON "EnterpriseLabelProject"("userId");
CREATE INDEX "EnterpriseLabelProject_baseTableId_idx" ON "EnterpriseLabelProject"("baseTableId");
CREATE INDEX "EnterpriseLabelProject_market_idx" ON "EnterpriseLabelProject"("market");
CREATE INDEX "EnterpriseLabelProject_status_idx" ON "EnterpriseLabelProject"("status");

CREATE UNIQUE INDEX "EnterpriseLabelVersion_projectId_version_key" ON "EnterpriseLabelVersion"("projectId", "version");
CREATE INDEX "EnterpriseLabelVersion_projectId_idx" ON "EnterpriseLabelVersion"("projectId");
CREATE INDEX "EnterpriseLabelVersion_userId_idx" ON "EnterpriseLabelVersion"("userId");
CREATE INDEX "EnterpriseLabelVersion_baseTableId_idx" ON "EnterpriseLabelVersion"("baseTableId");
CREATE INDEX "EnterpriseLabelVersion_market_idx" ON "EnterpriseLabelVersion"("market");
CREATE INDEX "EnterpriseLabelVersion_approvalStatus_idx" ON "EnterpriseLabelVersion"("approvalStatus");

CREATE INDEX "EnterpriseApproval_projectId_idx" ON "EnterpriseApproval"("projectId");
CREATE INDEX "EnterpriseApproval_userId_idx" ON "EnterpriseApproval"("userId");
CREATE INDEX "EnterpriseApproval_status_idx" ON "EnterpriseApproval"("status");

CREATE INDEX "EnterpriseExport_projectId_idx" ON "EnterpriseExport"("projectId");
CREATE INDEX "EnterpriseExport_versionId_idx" ON "EnterpriseExport"("versionId");
CREATE INDEX "EnterpriseExport_userId_idx" ON "EnterpriseExport"("userId");
CREATE INDEX "EnterpriseExport_exportType_idx" ON "EnterpriseExport"("exportType");

ALTER TABLE "EnterpriseLabelProject"
  ADD CONSTRAINT "EnterpriseLabelProject_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EnterpriseLabelProject"
  ADD CONSTRAINT "EnterpriseLabelProject_baseTableId_fkey"
  FOREIGN KEY ("baseTableId") REFERENCES "GeneratedTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EnterpriseLabelVersion"
  ADD CONSTRAINT "EnterpriseLabelVersion_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "EnterpriseLabelProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EnterpriseLabelVersion"
  ADD CONSTRAINT "EnterpriseLabelVersion_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EnterpriseLabelVersion"
  ADD CONSTRAINT "EnterpriseLabelVersion_baseTableId_fkey"
  FOREIGN KEY ("baseTableId") REFERENCES "GeneratedTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EnterpriseApproval"
  ADD CONSTRAINT "EnterpriseApproval_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "EnterpriseLabelProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EnterpriseApproval"
  ADD CONSTRAINT "EnterpriseApproval_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EnterpriseExport"
  ADD CONSTRAINT "EnterpriseExport_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "EnterpriseLabelProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EnterpriseExport"
  ADD CONSTRAINT "EnterpriseExport_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
