CREATE TYPE "DocumentType" AS ENUM (
  'NUTRITION_TABLE_ONLY',
  'PRODUCT_TECHNICAL_SHEET',
  'MATERIAL_SPECIFICATION',
  'LAB_REPORT',
  'CERTIFICATE',
  'UNKNOWN'
);

CREATE TYPE "ExtractionStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED'
);

CREATE TYPE "ReviewStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'NEEDS_REVIEW'
);

ALTER TABLE "CustomIngredient"
  ADD COLUMN "manufacturer" TEXT,
  ADD COLUMN "productCode" TEXT,
  ADD COLUMN "ingredientsText" TEXT,
  ADD COLUMN "containsGluten" BOOLEAN,
  ADD COLUMN "glutenText" TEXT,
  ADD COLUMN "allergensText" TEXT,
  ADD COLUMN "mayContainText" TEXT,
  ADD COLUMN "sugarAdded" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "sourceType" TEXT DEFAULT 'MANUAL',
  ADD COLUMN "sourceDocumentId" TEXT,
  ADD COLUMN "sourceExtractionId" TEXT;

ALTER TABLE "TableItem"
  ADD COLUMN "sugarAdded" DOUBLE PRECISION DEFAULT 0;

ALTER TABLE "GeneratedTable"
  ADD COLUMN "packageContent" DOUBLE PRECISION,
  ADD COLUMN "servingsPerPackage" TEXT,
  ADD COLUMN "suggestedFoodGroup" TEXT,
  ADD COLUMN "suggestedProduct" TEXT,
  ADD COLUMN "uiState" JSONB;

CREATE TABLE "TechnicalDocument" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TechnicalDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TechnicalSheetExtraction" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TechnicalSheetExtraction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExtractedNutrient" (
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

CREATE TABLE "ExtractedAllergen" (
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

CREATE UNIQUE INDEX "TechnicalSheetExtraction_documentId_key" ON "TechnicalSheetExtraction"("documentId");
CREATE INDEX "ExtractedNutrient_extractionId_idx" ON "ExtractedNutrient"("extractionId");
CREATE INDEX "ExtractedNutrient_nutrientKey_idx" ON "ExtractedNutrient"("nutrientKey");
CREATE INDEX "ExtractedAllergen_extractionId_idx" ON "ExtractedAllergen"("extractionId");
CREATE INDEX "ExtractedAllergen_allergenKey_idx" ON "ExtractedAllergen"("allergenKey");

ALTER TABLE "TechnicalDocument"
  ADD CONSTRAINT "TechnicalDocument_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TechnicalSheetExtraction"
  ADD CONSTRAINT "TechnicalSheetExtraction_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "TechnicalDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TechnicalSheetExtraction"
  ADD CONSTRAINT "TechnicalSheetExtraction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExtractedNutrient"
  ADD CONSTRAINT "ExtractedNutrient_extractionId_fkey"
  FOREIGN KEY ("extractionId") REFERENCES "TechnicalSheetExtraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExtractedAllergen"
  ADD CONSTRAINT "ExtractedAllergen_extractionId_fkey"
  FOREIGN KEY ("extractionId") REFERENCES "TechnicalSheetExtraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
