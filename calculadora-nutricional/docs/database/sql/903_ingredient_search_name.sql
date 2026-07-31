CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "Ingredient"
ADD COLUMN IF NOT EXISTS "searchName" TEXT NOT NULL DEFAULT '';

ALTER TABLE "CustomIngredient"
ADD COLUMN IF NOT EXISTS "searchName" TEXT NOT NULL DEFAULT '';

UPDATE "Ingredient"
SET "searchName" = unaccent(lower("name"))
WHERE "searchName" = '';

UPDATE "CustomIngredient"
SET "searchName" = unaccent(lower("name"))
WHERE "searchName" = '';

CREATE INDEX IF NOT EXISTS "Ingredient_searchName_trgm_idx"
ON "Ingredient" USING GIN ("searchName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "CustomIngredient_searchName_trgm_idx"
ON "CustomIngredient" USING GIN ("searchName" gin_trgm_ops);
