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

CREATE TABLE "ExtractedTechnicalField" (
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

CREATE INDEX "ExtractedTechnicalField_extractionId_idx" ON "ExtractedTechnicalField"("extractionId");
CREATE INDEX "ExtractedTechnicalField_category_idx" ON "ExtractedTechnicalField"("category");
CREATE INDEX "ExtractedTechnicalField_fieldKey_idx" ON "ExtractedTechnicalField"("fieldKey");

ALTER TABLE "ExtractedTechnicalField"
  ADD CONSTRAINT "ExtractedTechnicalField_extractionId_fkey"
  FOREIGN KEY ("extractionId") REFERENCES "TechnicalSheetExtraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
