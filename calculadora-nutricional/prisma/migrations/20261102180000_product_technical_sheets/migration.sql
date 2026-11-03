CREATE TABLE "ProductTechnicalSheet" (
    "id" TEXT NOT NULL, "tableId" TEXT NOT NULL, "organizationId" TEXT NOT NULL,
    "data" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ProductTechnicalSheet_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductTechnicalSheet_tableId_key" ON "ProductTechnicalSheet"("tableId");
CREATE INDEX "ProductTechnicalSheet_organizationId_idx" ON "ProductTechnicalSheet"("organizationId");
ALTER TABLE "ProductTechnicalSheet" ADD CONSTRAINT "ProductTechnicalSheet_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "GeneratedTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductTechnicalSheet" ADD CONSTRAINT "ProductTechnicalSheet_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "ProductLegislation" (
    "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "number" TEXT NOT NULL, "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductLegislation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProductLegislation_organizationId_idx" ON "ProductLegislation"("organizationId");
ALTER TABLE "ProductLegislation" ADD CONSTRAINT "ProductLegislation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
