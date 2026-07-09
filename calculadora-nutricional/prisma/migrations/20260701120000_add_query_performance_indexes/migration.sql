CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Ingredient_name_idx" ON "Ingredient"("name");
CREATE INDEX IF NOT EXISTS "Ingredient_name_trgm_idx" ON "Ingredient" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "CustomIngredient_userId_idx" ON "CustomIngredient"("userId");
CREATE INDEX IF NOT EXISTS "CustomIngredient_userId_createdAt_idx" ON "CustomIngredient"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "CustomIngredient_name_idx" ON "CustomIngredient"("name");
CREATE INDEX IF NOT EXISTS "CustomIngredient_name_trgm_idx" ON "CustomIngredient" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "GeneratedTable_userId_idx" ON "GeneratedTable"("userId");
CREATE INDEX IF NOT EXISTS "GeneratedTable_userId_createdAt_idx" ON "GeneratedTable"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "GeneratedTable_userId_updatedAt_idx" ON "GeneratedTable"("userId", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "TableItem_tableId_idx" ON "TableItem"("tableId");

CREATE INDEX IF NOT EXISTS "TechnicalDocument_userId_idx" ON "TechnicalDocument"("userId");
CREATE INDEX IF NOT EXISTS "TechnicalDocument_userId_createdAt_idx" ON "TechnicalDocument"("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "TechnicalSheetExtraction_userId_idx" ON "TechnicalSheetExtraction"("userId");
CREATE INDEX IF NOT EXISTS "TechnicalSheetExtraction_userId_documentId_idx" ON "TechnicalSheetExtraction"("userId", "documentId");

CREATE INDEX IF NOT EXISTS "EnterpriseLabelProject_userId_updatedAt_idx" ON "EnterpriseLabelProject"("userId", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "OrganizationMember_organizationId_role_createdAt_idx" ON "OrganizationMember"("organizationId", "role", "createdAt");
CREATE INDEX IF NOT EXISTS "OrganizationMember_organizationId_profileId_idx" ON "OrganizationMember"("organizationId", "profileId");
CREATE INDEX IF NOT EXISTS "OrganizationMember_userId_active_createdAt_idx" ON "OrganizationMember"("userId", "active", "createdAt");

CREATE INDEX IF NOT EXISTS "OrganizationProfile_organizationId_createdAt_idx" ON "OrganizationProfile"("organizationId", "createdAt");
