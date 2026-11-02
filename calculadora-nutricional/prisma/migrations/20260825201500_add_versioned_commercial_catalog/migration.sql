CREATE TYPE "FeatureValueType" AS ENUM ('BOOLEAN', 'QUOTA', 'METERED', 'SEAT_LIMIT');
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "PlanVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');
CREATE TYPE "BillingPriceStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'YEARLY');

ALTER TABLE "Plan"
  ADD COLUMN "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "isPaid" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE TABLE "FeatureDefinition" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "moduleKey" "SaaSModuleKey" NOT NULL,
  "type" "FeatureValueType" NOT NULL DEFAULT 'BOOLEAN',
  "unit" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "defaultValueJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FeatureDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlanVersion" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "status" "PlanVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "validFrom" TIMESTAMP(3),
  "retiredAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlanVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlanVersion_versionNumber_check" CHECK ("versionNumber" > 0)
);

CREATE TABLE "PlanVersionFeature" (
  "id" TEXT NOT NULL,
  "planVersionId" TEXT NOT NULL,
  "featureDefinitionId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "limitValue" INTEGER,
  "configJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlanVersionFeature_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlanVersionFeature_limitValue_check" CHECK ("limitValue" IS NULL OR "limitValue" >= 0)
);

CREATE TABLE "BillingPrice" (
  "id" TEXT NOT NULL,
  "planVersionId" TEXT NOT NULL,
  "provider" TEXT,
  "providerPriceRef" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "amountMinor" INTEGER NOT NULL,
  "billingInterval" "BillingInterval" NOT NULL,
  "status" "BillingPriceStatus" NOT NULL DEFAULT 'ACTIVE',
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BillingPrice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingPrice_amountMinor_check" CHECK ("amountMinor" > 0),
  CONSTRAINT "BillingPrice_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$')
);

ALTER TABLE "Subscription"
  ADD COLUMN "planVersionId" TEXT,
  ADD COLUMN "billingPriceId" TEXT;

CREATE UNIQUE INDEX "FeatureDefinition_key_key" ON "FeatureDefinition"("key");
CREATE INDEX "FeatureDefinition_moduleKey_isActive_idx" ON "FeatureDefinition"("moduleKey", "isActive");
CREATE INDEX "FeatureDefinition_type_isActive_idx" ON "FeatureDefinition"("type", "isActive");
CREATE UNIQUE INDEX "PlanVersion_planId_versionNumber_key" ON "PlanVersion"("planId", "versionNumber");
CREATE INDEX "PlanVersion_planId_status_idx" ON "PlanVersion"("planId", "status");
CREATE INDEX "PlanVersion_status_publishedAt_idx" ON "PlanVersion"("status", "publishedAt");
CREATE INDEX "PlanVersion_createdByUserId_idx" ON "PlanVersion"("createdByUserId");
CREATE UNIQUE INDEX "PlanVersionFeature_planVersionId_featureDefinitionId_key" ON "PlanVersionFeature"("planVersionId", "featureDefinitionId");
CREATE INDEX "PlanVersionFeature_featureDefinitionId_idx" ON "PlanVersionFeature"("featureDefinitionId");
CREATE INDEX "BillingPrice_planVersionId_status_idx" ON "BillingPrice"("planVersionId", "status");
CREATE INDEX "BillingPrice_provider_providerPriceRef_idx" ON "BillingPrice"("provider", "providerPriceRef");
CREATE INDEX "BillingPrice_currency_billingInterval_status_idx" ON "BillingPrice"("currency", "billingInterval", "status");
CREATE INDEX "Plan_status_idx" ON "Plan"("status");
CREATE INDEX "Subscription_planVersionId_idx" ON "Subscription"("planVersionId");
CREATE INDEX "Subscription_billingPriceId_idx" ON "Subscription"("billingPriceId");

ALTER TABLE "PlanVersion"
  ADD CONSTRAINT "PlanVersion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PlanVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlanVersionFeature"
  ADD CONSTRAINT "PlanVersionFeature_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PlanVersionFeature_featureDefinitionId_fkey" FOREIGN KEY ("featureDefinitionId") REFERENCES "FeatureDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BillingPrice"
  ADD CONSTRAINT "BillingPrice_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Subscription_billingPriceId_fkey" FOREIGN KEY ("billingPriceId") REFERENCES "BillingPrice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "FeatureDefinition" (
  "id", "key", "name", "description", "moduleKey", "type", "unit", "updatedAt"
) VALUES
  ('feature_tables', 'tables', 'Tabelas nutricionais', 'Criar, editar e calcular tabelas nutricionais.', 'TABLES', 'BOOLEAN', NULL, CURRENT_TIMESTAMP),
  ('feature_custom_ingredients', 'custom_ingredients', 'Ingredientes próprios', 'Manter biblioteca privada de ingredientes.', 'CUSTOM_INGREDIENTS', 'BOOLEAN', NULL, CURRENT_TIMESTAMP),
  ('feature_technical_sheets', 'technical_sheets', 'Fichas técnicas', 'Importar e revisar fichas técnicas.', 'TECHNICAL_SHEETS', 'BOOLEAN', NULL, CURRENT_TIMESTAMP),
  ('feature_open_food_facts', 'open_food_facts', 'Open Food Facts', 'Consultar e importar produtos do catálogo público.', 'OPEN_FOOD_FACTS', 'BOOLEAN', NULL, CURRENT_TIMESTAMP),
  ('feature_enterprise_labels', 'enterprise_labels', 'Fluxo Enterprise', 'Gerenciar projetos, versões e aprovações internacionais.', 'ENTERPRISE_LABELS', 'BOOLEAN', NULL, CURRENT_TIMESTAMP),
  ('feature_exports', 'exports', 'Exportações', 'Gerar documentos e formatos de exportação.', 'EXPORTS', 'BOOLEAN', NULL, CURRENT_TIMESTAMP),
  ('feature_ai_import', 'ai_import', 'Importação com IA', 'Interpretar documentos técnicos com IA.', 'AI_IMPORT', 'BOOLEAN', NULL, CURRENT_TIMESTAMP),
  ('feature_ai_imports_monthly', 'ai_imports_monthly', 'Importações com IA por mês', 'Limite mensal de interpretações com IA.', 'AI_IMPORT', 'QUOTA', 'imports/month', CURRENT_TIMESTAMP),
  ('feature_api_access', 'api_access', 'Acesso à API', 'Criar e usar credenciais da API.', 'API_ACCESS', 'BOOLEAN', NULL, CURRENT_TIMESTAMP),
  ('feature_settings', 'settings', 'Configurações do workspace', 'Gerenciar participantes, perfis e configurações.', 'SETTINGS', 'BOOLEAN', NULL, CURRENT_TIMESTAMP),
  ('feature_seats_max', 'seats_max', 'Limite de seats', 'Quantidade máxima de memberships contabilizadas.', 'SETTINGS', 'SEAT_LIMIT', 'users', CURRENT_TIMESTAMP);

UPDATE "Plan"
SET
  "status" = CASE WHEN "active" THEN 'ACTIVE'::"PlanStatus" ELSE 'ARCHIVED'::"PlanStatus" END,
  "isPaid" = GREATEST("monthlyPriceCents", "quarterlyPriceCents", "semiannualPriceCents", "yearlyPriceCents") > 0,
  "archivedAt" = CASE WHEN "active" THEN NULL ELSE "updatedAt" END;

INSERT INTO "PlanVersion" (
  "id", "planId", "versionNumber", "status", "publishedAt", "validFrom", "createdAt", "updatedAt"
)
SELECT
  'pv_legacy_' || md5("id"), "id", 1, 'PUBLISHED', "createdAt", "createdAt", "createdAt", "updatedAt"
FROM "Plan";

INSERT INTO "PlanVersionFeature" (
  "id", "planVersionId", "featureDefinitionId", "enabled", "limitValue", "createdAt", "updatedAt"
)
SELECT
  'pvf_legacy_' || md5(pm."id"),
  'pv_legacy_' || md5(pm."planId"),
  fd."id",
  pm."enabled",
  pm."usageLimit",
  pm."createdAt",
  pm."createdAt"
FROM "PlanModule" pm
JOIN "FeatureDefinition" fd ON fd."key" = lower(pm."moduleKey"::text);

INSERT INTO "BillingPrice" (
  "id", "planVersionId", "provider", "providerPriceRef", "currency", "amountMinor", "billingInterval", "status", "createdAt"
)
SELECT
  'price_legacy_' || md5(p."id" || price.interval::text),
  'pv_legacy_' || md5(p."id"),
  CASE WHEN price.provider_ref IS NULL THEN NULL ELSE 'STRIPE' END,
  price.provider_ref,
  'BRL',
  price.amount_minor,
  price.interval,
  CASE WHEN p."active" THEN 'ACTIVE'::"BillingPriceStatus" ELSE 'ARCHIVED'::"BillingPriceStatus" END,
  p."createdAt"
FROM "Plan" p
CROSS JOIN LATERAL (
  VALUES
    ('MONTHLY'::"BillingInterval", p."monthlyPriceCents", p."stripeMonthlyPriceId"),
    ('QUARTERLY'::"BillingInterval", p."quarterlyPriceCents", p."stripeQuarterlyPriceId"),
    ('SEMIANNUAL'::"BillingInterval", p."semiannualPriceCents", p."stripeSemiannualPriceId"),
    ('YEARLY'::"BillingInterval", p."yearlyPriceCents", p."stripeYearlyPriceId")
) AS price(interval, amount_minor, provider_ref)
WHERE price.amount_minor > 0;

UPDATE "Subscription" subscription
SET "planVersionId" = 'pv_legacy_' || md5(subscription."planId")
WHERE subscription."planId" IS NOT NULL;

UPDATE "Subscription" subscription
SET "billingPriceId" = price."id"
FROM "BillingPrice" price
WHERE subscription."planVersionId" = price."planVersionId"
  AND subscription."providerPriceId" IS NOT NULL
  AND subscription."providerPriceId" = price."providerPriceRef";

CREATE OR REPLACE FUNCTION enforce_plan_version_immutability()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" <> 'DRAFT' THEN
      RAISE EXCEPTION 'published or retired plan versions are immutable';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD."status" = 'DRAFT' THEN
    IF NEW."status" NOT IN ('DRAFT', 'PUBLISHED') THEN
      RAISE EXCEPTION 'draft plan version can only remain draft or be published';
    END IF;
    IF NEW."status" = 'PUBLISHED' AND NEW."publishedAt" IS NULL THEN
      RAISE EXCEPTION 'published plan version requires publishedAt';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD."status" = 'PUBLISHED'
    AND NEW."status" IN ('PUBLISHED', 'RETIRED')
    AND NEW."planId" = OLD."planId"
    AND NEW."versionNumber" = OLD."versionNumber"
    AND NEW."publishedAt" IS NOT DISTINCT FROM OLD."publishedAt"
    AND NEW."validFrom" IS NOT DISTINCT FROM OLD."validFrom"
    AND NEW."createdByUserId" IS NOT DISTINCT FROM OLD."createdByUserId"
    AND NEW."createdAt" = OLD."createdAt"
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'published or retired plan versions are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PlanVersion_immutable_after_publish"
BEFORE UPDATE OR DELETE ON "PlanVersion"
FOR EACH ROW EXECUTE FUNCTION enforce_plan_version_immutability();

CREATE OR REPLACE FUNCTION enforce_plan_version_feature_immutability()
RETURNS trigger AS $$
DECLARE
  version_id TEXT;
  version_status "PlanVersionStatus";
BEGIN
  version_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."planVersionId" ELSE NEW."planVersionId" END;
  SELECT "status" INTO version_status FROM "PlanVersion" WHERE "id" = version_id;
  IF version_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'features of published or retired plan versions are immutable';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PlanVersionFeature_immutable_after_publish"
BEFORE INSERT OR UPDATE OR DELETE ON "PlanVersionFeature"
FOR EACH ROW EXECUTE FUNCTION enforce_plan_version_feature_immutability();

CREATE OR REPLACE FUNCTION enforce_billing_price_immutability()
RETURNS trigger AS $$
DECLARE
  version_status "PlanVersionStatus";
BEGIN
  SELECT "status" INTO version_status
  FROM "PlanVersion"
  WHERE "id" = CASE WHEN TG_OP = 'DELETE' THEN OLD."planVersionId" ELSE NEW."planVersionId" END;

  IF TG_OP = 'INSERT' THEN
    IF version_status = 'RETIRED' THEN
      RAISE EXCEPTION 'cannot add a price to a retired plan version';
    END IF;
    RETURN NEW;
  END IF;

  IF version_status = 'DRAFT' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD."status" = 'ACTIVE'
    AND NEW."status" = 'ARCHIVED'
    AND NEW."archivedAt" IS NOT NULL
    AND NEW."planVersionId" = OLD."planVersionId"
    AND NEW."provider" IS NOT DISTINCT FROM OLD."provider"
    AND NEW."providerPriceRef" IS NOT DISTINCT FROM OLD."providerPriceRef"
    AND NEW."currency" = OLD."currency"
    AND NEW."amountMinor" = OLD."amountMinor"
    AND NEW."billingInterval" = OLD."billingInterval"
    AND NEW."createdAt" = OLD."createdAt"
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'prices of published or retired plan versions are immutable; create a new price or archive the active one';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "BillingPrice_immutable_after_publish"
BEFORE INSERT OR UPDATE OR DELETE ON "BillingPrice"
FOR EACH ROW EXECUTE FUNCTION enforce_billing_price_immutability();
