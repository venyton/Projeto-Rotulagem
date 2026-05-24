import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rejectCrossOriginRequest } from "@/lib/security/request-origin";

export const dynamic = "force-dynamic";

type MigrationStep = {
    name: string;
    sql: string;
};

const enumSteps: MigrationStep[] = [
    {
        name: "DocumentType",
        sql: `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentType') THEN
    CREATE TYPE "DocumentType" AS ENUM (
      'NUTRITION_TABLE_ONLY',
      'PRODUCT_TECHNICAL_SHEET',
      'MATERIAL_SPECIFICATION',
      'LAB_REPORT',
      'CERTIFICATE',
      'UNKNOWN'
    );
  END IF;
END $$;`,
    },
    {
        name: "ExtractionStatus",
        sql: `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExtractionStatus') THEN
    CREATE TYPE "ExtractionStatus" AS ENUM (
      'PENDING',
      'PROCESSING',
      'COMPLETED',
      'FAILED'
    );
  END IF;
END $$;`,
    },
    {
        name: "ReviewStatus",
        sql: `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReviewStatus') THEN
    CREATE TYPE "ReviewStatus" AS ENUM (
      'PENDING',
      'APPROVED',
      'REJECTED',
      'NEEDS_REVIEW'
    );
  END IF;
END $$;`,
    },
    {
        name: "TechnicalFieldCategory",
        sql: `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TechnicalFieldCategory') THEN
    CREATE TYPE "TechnicalFieldCategory" AS ENUM (
      'REGULATORY',
      'DECLARATION',
      'SENSORY',
      'PHYSICOCHEMICAL',
      'MICROBIOLOGICAL',
      'CONTAMINANT',
      'TRACEABILITY',
      'LOGISTICS',
      'CERTIFICATION',
      'WARNING'
    );
  END IF;
END $$;`,
    },
    {
        name: "EnterpriseApprovalStatus",
        sql: `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EnterpriseApprovalStatus') THEN
    CREATE TYPE "EnterpriseApprovalStatus" AS ENUM (
      'DRAFT',
      'QUALITY',
      'REGULATORY',
      'MARKETING',
      'APPROVED'
    );
  END IF;
END $$;`,
    },
    {
        name: "EnterpriseExportType",
        sql: `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EnterpriseExportType') THEN
    CREATE TYPE "EnterpriseExportType" AS ENUM (
      'PNG',
      'JSON',
      'GS1_DIGITAL_LINK'
    );
  END IF;
END $$;`,
    },
];

const tableSteps: MigrationStep[] = [
    {
        name: "User 2FA columns",
        sql: `
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT,
  ADD COLUMN IF NOT EXISTS "twoFactorPendingSecret" TEXT,
  ADD COLUMN IF NOT EXISTS "twoFactorConfirmedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "twoFactorLastUsedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "User_twoFactorEnabled_idx" ON "User"("twoFactorEnabled");`,
    },
    {
        name: "CustomIngredient technical columns",
        sql: `
ALTER TABLE "CustomIngredient"
  ADD COLUMN IF NOT EXISTS "manufacturer" TEXT,
  ADD COLUMN IF NOT EXISTS "productCode" TEXT,
  ADD COLUMN IF NOT EXISTS "ingredientsText" TEXT,
  ADD COLUMN IF NOT EXISTS "containsGluten" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "glutenText" TEXT,
  ADD COLUMN IF NOT EXISTS "allergensText" TEXT,
  ADD COLUMN IF NOT EXISTS "mayContainText" TEXT,
  ADD COLUMN IF NOT EXISTS "sugarAdded" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "sourceType" TEXT DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "sourceDocumentId" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceExtractionId" TEXT;`,
    },
    {
        name: "Ingredient and CustomIngredient micronutrients",
        sql: `
ALTER TABLE "Ingredient"
  ADD COLUMN IF NOT EXISTS "sugarTotal" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "fatMono" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "fatPoly" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "omega6" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "omega3" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cholesterol" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "vitaminA" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "vitaminD" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "vitaminE" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "vitaminK" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "vitaminC" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "thiamin" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "riboflavin" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "niacin" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "vitaminB6" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "biotin" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "folicAcid" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "pantothenicAcid" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "vitaminB12" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "calcium" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "chloride" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "copper" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "chromium" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "iron" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "fluoride" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "phosphorus" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "iodine" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "magnesium" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "manganese" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "molybdenum" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "potassium" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "selenium" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "zinc" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "choline" DOUBLE PRECISION DEFAULT 0;

ALTER TABLE "CustomIngredient"
  ADD COLUMN IF NOT EXISTS "fatMono" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "fatPoly" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "omega6" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "omega3" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cholesterol" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "vitaminA" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "vitaminD" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "vitaminE" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "vitaminK" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "vitaminC" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "thiamin" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "riboflavin" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "niacin" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "vitaminB6" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "biotin" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "folicAcid" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "pantothenicAcid" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "vitaminB12" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "calcium" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "chloride" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "copper" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "chromium" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "iron" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "fluoride" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "phosphorus" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "iodine" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "magnesium" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "manganese" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "molybdenum" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "potassium" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "selenium" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "zinc" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "choline" DOUBLE PRECISION DEFAULT 0;`,
    },
    {
        name: "TableItem and GeneratedTable columns",
        sql: `
ALTER TABLE "TableItem"
  ADD COLUMN IF NOT EXISTS "sugarAdded" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "fatMono" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "fatPoly" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "omega6" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "omega3" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "cholesterol" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "vitaminA" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "vitaminD" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "vitaminE" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "vitaminK" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "vitaminC" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "thiamin" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "riboflavin" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "niacin" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "vitaminB6" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "biotin" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "folicAcid" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "pantothenicAcid" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "vitaminB12" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "calcium" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "chloride" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "copper" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "chromium" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "iron" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "fluoride" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "phosphorus" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "iodine" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "magnesium" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "manganese" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "molybdenum" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "potassium" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "selenium" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "zinc" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "choline" DOUBLE PRECISION;

ALTER TABLE "GeneratedTable"
  ADD COLUMN IF NOT EXISTS "packageContent" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "servingsPerPackage" TEXT,
  ADD COLUMN IF NOT EXISTS "suggestedFoodGroup" TEXT,
  ADD COLUMN IF NOT EXISTS "suggestedProduct" TEXT,
  ADD COLUMN IF NOT EXISTS "uiState" JSONB;`,
    },
    {
        name: "Technical sheet tables",
        sql: `
CREATE TABLE IF NOT EXISTS "TechnicalDocument" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT,
  "mimeType" TEXT,
  "documentType" "DocumentType" NOT NULL DEFAULT 'UNKNOWN',
  "status" "ExtractionStatus" NOT NULL DEFAULT 'PENDING',
  "rawText" TEXT,
  "extractedJson" JSONB,
  "errorMessage" TEXT,
  "confidence" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TechnicalDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TechnicalSheetExtraction" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "productName" TEXT,
  "productCode" TEXT,
  "manufacturer" TEXT,
  "brand" TEXT,
  "version" TEXT,
  "revision" TEXT,
  "issueDate" TIMESTAMP(3),
  "revisionDate" TIMESTAMP(3),
  "description" TEXT,
  "applicationAndDosage" TEXT,
  "compositionText" TEXT,
  "ingredientsText" TEXT,
  "containsGluten" BOOLEAN,
  "glutenText" TEXT,
  "containsGmo" BOOLEAN,
  "gmoText" TEXT,
  "allergensText" TEXT,
  "mayContainText" TEXT,
  "shelfLife" TEXT,
  "storageConditions" TEXT,
  "packagingText" TEXT,
  "servingQuantity" DOUBLE PRECISION,
  "servingUnit" TEXT,
  "householdMeasure" TEXT,
  "servingsPerPackage" TEXT,
  "baseQuantity" DOUBLE PRECISION NOT NULL DEFAULT 100,
  "baseUnit" TEXT NOT NULL DEFAULT 'g',
  "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
  "confidence" DOUBLE PRECISION,
  "approvedTargetType" TEXT,
  "approvedTargetId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TechnicalSheetExtraction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ExtractedNutrient" (
  "id" TEXT NOT NULL,
  "extractionId" TEXT NOT NULL,
  "nutrientKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "value" DOUBLE PRECISION,
  "unit" TEXT,
  "baseQuantity" DOUBLE PRECISION NOT NULL DEFAULT 100,
  "baseUnit" TEXT NOT NULL DEFAULT 'g',
  "dailyValuePercent" DOUBLE PRECISION,
  "sourceText" TEXT,
  "confidence" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExtractedNutrient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ExtractedAllergen" (
  "id" TEXT NOT NULL,
  "extractionId" TEXT NOT NULL,
  "allergenKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "declarationType" TEXT,
  "present" BOOLEAN,
  "controlled" BOOLEAN,
  "sourceText" TEXT,
  "confidence" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExtractedAllergen_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TechnicalSheetExtraction_documentId_key" ON "TechnicalSheetExtraction"("documentId");
CREATE INDEX IF NOT EXISTS "ExtractedNutrient_extractionId_idx" ON "ExtractedNutrient"("extractionId");
CREATE INDEX IF NOT EXISTS "ExtractedNutrient_nutrientKey_idx" ON "ExtractedNutrient"("nutrientKey");
CREATE INDEX IF NOT EXISTS "ExtractedAllergen_extractionId_idx" ON "ExtractedAllergen"("extractionId");
CREATE INDEX IF NOT EXISTS "ExtractedAllergen_allergenKey_idx" ON "ExtractedAllergen"("allergenKey");`,
    },
    {
        name: "ExtractedTechnicalField table",
        sql: `
CREATE TABLE IF NOT EXISTS "ExtractedTechnicalField" (
  "id" TEXT NOT NULL,
  "extractionId" TEXT NOT NULL,
  "category" "TechnicalFieldCategory" NOT NULL,
  "fieldKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "value" TEXT,
  "unit" TEXT,
  "method" TEXT,
  "sourceText" TEXT,
  "confidence" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExtractedTechnicalField_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ExtractedTechnicalField_extractionId_idx" ON "ExtractedTechnicalField"("extractionId");
CREATE INDEX IF NOT EXISTS "ExtractedTechnicalField_category_idx" ON "ExtractedTechnicalField"("category");
CREATE INDEX IF NOT EXISTS "ExtractedTechnicalField_fieldKey_idx" ON "ExtractedTechnicalField"("fieldKey");`,
    },
    {
        name: "Enterprise tables",
        sql: `
CREATE TABLE IF NOT EXISTS "EnterpriseLabelProject" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "baseTableId" TEXT,
  "title" TEXT NOT NULL,
  "market" TEXT NOT NULL,
  "status" "EnterpriseApprovalStatus" NOT NULL DEFAULT 'DRAFT',
  "currentVersionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EnterpriseLabelProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EnterpriseLabelVersion" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EnterpriseLabelVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EnterpriseApproval" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "EnterpriseApprovalStatus" NOT NULL,
  "owner" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EnterpriseApproval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EnterpriseExport" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "EnterpriseLabelProject_userId_baseTableId_market_key" ON "EnterpriseLabelProject"("userId", "baseTableId", "market");
CREATE INDEX IF NOT EXISTS "EnterpriseLabelProject_userId_idx" ON "EnterpriseLabelProject"("userId");
CREATE INDEX IF NOT EXISTS "EnterpriseLabelProject_baseTableId_idx" ON "EnterpriseLabelProject"("baseTableId");
CREATE INDEX IF NOT EXISTS "EnterpriseLabelProject_market_idx" ON "EnterpriseLabelProject"("market");
CREATE INDEX IF NOT EXISTS "EnterpriseLabelProject_status_idx" ON "EnterpriseLabelProject"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "EnterpriseLabelVersion_projectId_version_key" ON "EnterpriseLabelVersion"("projectId", "version");
CREATE INDEX IF NOT EXISTS "EnterpriseLabelVersion_projectId_idx" ON "EnterpriseLabelVersion"("projectId");
CREATE INDEX IF NOT EXISTS "EnterpriseLabelVersion_userId_idx" ON "EnterpriseLabelVersion"("userId");
CREATE INDEX IF NOT EXISTS "EnterpriseLabelVersion_baseTableId_idx" ON "EnterpriseLabelVersion"("baseTableId");
CREATE INDEX IF NOT EXISTS "EnterpriseLabelVersion_market_idx" ON "EnterpriseLabelVersion"("market");
CREATE INDEX IF NOT EXISTS "EnterpriseLabelVersion_approvalStatus_idx" ON "EnterpriseLabelVersion"("approvalStatus");
CREATE INDEX IF NOT EXISTS "EnterpriseApproval_projectId_idx" ON "EnterpriseApproval"("projectId");
CREATE INDEX IF NOT EXISTS "EnterpriseApproval_userId_idx" ON "EnterpriseApproval"("userId");
CREATE INDEX IF NOT EXISTS "EnterpriseApproval_status_idx" ON "EnterpriseApproval"("status");
CREATE INDEX IF NOT EXISTS "EnterpriseExport_projectId_idx" ON "EnterpriseExport"("projectId");
CREATE INDEX IF NOT EXISTS "EnterpriseExport_versionId_idx" ON "EnterpriseExport"("versionId");
CREATE INDEX IF NOT EXISTS "EnterpriseExport_userId_idx" ON "EnterpriseExport"("userId");
CREATE INDEX IF NOT EXISTS "EnterpriseExport_exportType_idx" ON "EnterpriseExport"("exportType");`,
    },
];

const constraintSteps: MigrationStep[] = [
    {
        name: "foreign keys",
        sql: `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TechnicalDocument_userId_fkey') THEN
    ALTER TABLE "TechnicalDocument" ADD CONSTRAINT "TechnicalDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TechnicalSheetExtraction_documentId_fkey') THEN
    ALTER TABLE "TechnicalSheetExtraction" ADD CONSTRAINT "TechnicalSheetExtraction_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "TechnicalDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TechnicalSheetExtraction_userId_fkey') THEN
    ALTER TABLE "TechnicalSheetExtraction" ADD CONSTRAINT "TechnicalSheetExtraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExtractedNutrient_extractionId_fkey') THEN
    ALTER TABLE "ExtractedNutrient" ADD CONSTRAINT "ExtractedNutrient_extractionId_fkey" FOREIGN KEY ("extractionId") REFERENCES "TechnicalSheetExtraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExtractedAllergen_extractionId_fkey') THEN
    ALTER TABLE "ExtractedAllergen" ADD CONSTRAINT "ExtractedAllergen_extractionId_fkey" FOREIGN KEY ("extractionId") REFERENCES "TechnicalSheetExtraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExtractedTechnicalField_extractionId_fkey') THEN
    ALTER TABLE "ExtractedTechnicalField" ADD CONSTRAINT "ExtractedTechnicalField_extractionId_fkey" FOREIGN KEY ("extractionId") REFERENCES "TechnicalSheetExtraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EnterpriseLabelProject_userId_fkey') THEN
    ALTER TABLE "EnterpriseLabelProject" ADD CONSTRAINT "EnterpriseLabelProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EnterpriseLabelProject_baseTableId_fkey') THEN
    ALTER TABLE "EnterpriseLabelProject" ADD CONSTRAINT "EnterpriseLabelProject_baseTableId_fkey" FOREIGN KEY ("baseTableId") REFERENCES "GeneratedTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EnterpriseLabelVersion_projectId_fkey') THEN
    ALTER TABLE "EnterpriseLabelVersion" ADD CONSTRAINT "EnterpriseLabelVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "EnterpriseLabelProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EnterpriseLabelVersion_userId_fkey') THEN
    ALTER TABLE "EnterpriseLabelVersion" ADD CONSTRAINT "EnterpriseLabelVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EnterpriseLabelVersion_baseTableId_fkey') THEN
    ALTER TABLE "EnterpriseLabelVersion" ADD CONSTRAINT "EnterpriseLabelVersion_baseTableId_fkey" FOREIGN KEY ("baseTableId") REFERENCES "GeneratedTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EnterpriseApproval_projectId_fkey') THEN
    ALTER TABLE "EnterpriseApproval" ADD CONSTRAINT "EnterpriseApproval_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "EnterpriseLabelProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EnterpriseApproval_userId_fkey') THEN
    ALTER TABLE "EnterpriseApproval" ADD CONSTRAINT "EnterpriseApproval_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EnterpriseExport_projectId_fkey') THEN
    ALTER TABLE "EnterpriseExport" ADD CONSTRAINT "EnterpriseExport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "EnterpriseLabelProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EnterpriseExport_userId_fkey') THEN
    ALTER TABLE "EnterpriseExport" ADD CONSTRAINT "EnterpriseExport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;`,
    },
];

export async function GET() {
    return NextResponse.json(
        { error: "Método não permitido" },
        { status: 405, headers: { Allow: "POST" } }
    );
}

export async function POST(req: NextRequest) {
    const originError = rejectCrossOriginRequest(req);
    if (originError) return originError;

    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const results: string[] = [];
    const errors: string[] = [];

    for (const step of [...enumSteps, ...tableSteps, ...constraintSteps]) {
        try {
            for (const statement of splitSqlStatements(step.sql)) {
                await prisma.$executeRawUnsafe(statement);
            }
            results.push(`Success: ${step.name}`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            errors.push(`Error in ${step.name}: ${message}`);
        }
    }

    return NextResponse.json({
        success: errors.length === 0,
        results,
        errors,
    });
}

function splitSqlStatements(sql: string) {
    const trimmed = sql.trim();
    if (trimmed.startsWith("DO $$")) return [trimmed];

    return trimmed
        .split(/;\s*\n/)
        .map((statement) => statement.trim())
        .filter(Boolean);
}
