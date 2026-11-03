-- Baseline anterior à adoção do Prisma Migrate neste repositório.
-- Fonte verificável: as cinco tabelas-base de prisma/schema.prisma no commit
-- eea542a60f516ec06dbbf78b1f29d7ba4fd23496, removendo somente as colunas que
-- a primeira migration versionada declara adicionar. Essa inversão evita
-- duplicar DDL já contido em 20260513200000_add_technical_sheet_imports.
--
-- Banco novo: esta migration deve ser executada normalmente antes das demais.
-- Banco preexistente: marque-a como aplicada com `prisma migrate resolve`;
-- nunca execute este SQL sobre tabelas que já existam.

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "energy" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "fatTotal" DOUBLE PRECISION NOT NULL,
    "fatSat" DOUBLE PRECISION NOT NULL,
    "fatTrans" DOUBLE PRECISION NOT NULL,
    "fiber" DOUBLE PRECISION NOT NULL,
    "sodium" DOUBLE PRECISION NOT NULL,
    "sugarTotal" DOUBLE PRECISION,
    "origin" TEXT,
    "fatMono" DOUBLE PRECISION DEFAULT 0,
    "fatPoly" DOUBLE PRECISION DEFAULT 0,
    "omega6" DOUBLE PRECISION DEFAULT 0,
    "omega3" DOUBLE PRECISION DEFAULT 0,
    "cholesterol" DOUBLE PRECISION DEFAULT 0,
    "vitaminA" DOUBLE PRECISION DEFAULT 0,
    "vitaminD" DOUBLE PRECISION DEFAULT 0,
    "vitaminE" DOUBLE PRECISION DEFAULT 0,
    "vitaminK" DOUBLE PRECISION DEFAULT 0,
    "vitaminC" DOUBLE PRECISION DEFAULT 0,
    "thiamin" DOUBLE PRECISION DEFAULT 0,
    "riboflavin" DOUBLE PRECISION DEFAULT 0,
    "niacin" DOUBLE PRECISION DEFAULT 0,
    "vitaminB6" DOUBLE PRECISION DEFAULT 0,
    "biotin" DOUBLE PRECISION DEFAULT 0,
    "folicAcid" DOUBLE PRECISION DEFAULT 0,
    "pantothenicAcid" DOUBLE PRECISION DEFAULT 0,
    "vitaminB12" DOUBLE PRECISION DEFAULT 0,
    "calcium" DOUBLE PRECISION DEFAULT 0,
    "chloride" DOUBLE PRECISION DEFAULT 0,
    "copper" DOUBLE PRECISION DEFAULT 0,
    "chromium" DOUBLE PRECISION DEFAULT 0,
    "iron" DOUBLE PRECISION DEFAULT 0,
    "fluoride" DOUBLE PRECISION DEFAULT 0,
    "phosphorus" DOUBLE PRECISION DEFAULT 0,
    "iodine" DOUBLE PRECISION DEFAULT 0,
    "magnesium" DOUBLE PRECISION DEFAULT 0,
    "manganese" DOUBLE PRECISION DEFAULT 0,
    "molybdenum" DOUBLE PRECISION DEFAULT 0,
    "potassium" DOUBLE PRECISION DEFAULT 0,
    "selenium" DOUBLE PRECISION DEFAULT 0,
    "zinc" DOUBLE PRECISION DEFAULT 0,
    "choline" DOUBLE PRECISION DEFAULT 0,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomIngredient" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "energy" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "fatTotal" DOUBLE PRECISION NOT NULL,
    "fatSat" DOUBLE PRECISION NOT NULL,
    "fatTrans" DOUBLE PRECISION NOT NULL,
    "fiber" DOUBLE PRECISION NOT NULL,
    "sodium" DOUBLE PRECISION NOT NULL,
    "sugarTotal" DOUBLE PRECISION NOT NULL,
    "fatMono" DOUBLE PRECISION DEFAULT 0,
    "fatPoly" DOUBLE PRECISION DEFAULT 0,
    "omega6" DOUBLE PRECISION DEFAULT 0,
    "omega3" DOUBLE PRECISION DEFAULT 0,
    "cholesterol" DOUBLE PRECISION DEFAULT 0,
    "vitaminA" DOUBLE PRECISION DEFAULT 0,
    "vitaminD" DOUBLE PRECISION DEFAULT 0,
    "vitaminE" DOUBLE PRECISION DEFAULT 0,
    "vitaminK" DOUBLE PRECISION DEFAULT 0,
    "vitaminC" DOUBLE PRECISION DEFAULT 0,
    "thiamin" DOUBLE PRECISION DEFAULT 0,
    "riboflavin" DOUBLE PRECISION DEFAULT 0,
    "niacin" DOUBLE PRECISION DEFAULT 0,
    "vitaminB6" DOUBLE PRECISION DEFAULT 0,
    "biotin" DOUBLE PRECISION DEFAULT 0,
    "folicAcid" DOUBLE PRECISION DEFAULT 0,
    "pantothenicAcid" DOUBLE PRECISION DEFAULT 0,
    "vitaminB12" DOUBLE PRECISION DEFAULT 0,
    "calcium" DOUBLE PRECISION DEFAULT 0,
    "chloride" DOUBLE PRECISION DEFAULT 0,
    "copper" DOUBLE PRECISION DEFAULT 0,
    "chromium" DOUBLE PRECISION DEFAULT 0,
    "iron" DOUBLE PRECISION DEFAULT 0,
    "fluoride" DOUBLE PRECISION DEFAULT 0,
    "phosphorus" DOUBLE PRECISION DEFAULT 0,
    "iodine" DOUBLE PRECISION DEFAULT 0,
    "magnesium" DOUBLE PRECISION DEFAULT 0,
    "manganese" DOUBLE PRECISION DEFAULT 0,
    "molybdenum" DOUBLE PRECISION DEFAULT 0,
    "potassium" DOUBLE PRECISION DEFAULT 0,
    "selenium" DOUBLE PRECISION DEFAULT 0,
    "zinc" DOUBLE PRECISION DEFAULT 0,
    "choline" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomIngredient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GeneratedTable" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "portion" DOUBLE PRECISION NOT NULL,
    "uom" TEXT NOT NULL,
    "householdMeasure" TEXT NOT NULL,
    "popGroup" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedTable_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TableItem" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "isAddedSugar" BOOLEAN NOT NULL DEFAULT false,
    "energy" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "fatTotal" DOUBLE PRECISION NOT NULL,
    "fatSat" DOUBLE PRECISION NOT NULL,
    "fatTrans" DOUBLE PRECISION NOT NULL,
    "fiber" DOUBLE PRECISION NOT NULL,
    "sodium" DOUBLE PRECISION NOT NULL,
    "sugarTotal" DOUBLE PRECISION,

    CONSTRAINT "TableItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

ALTER TABLE "CustomIngredient"
    ADD CONSTRAINT "CustomIngredient_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GeneratedTable"
    ADD CONSTRAINT "GeneratedTable_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TableItem"
    ADD CONSTRAINT "TableItem_tableId_fkey"
    FOREIGN KEY ("tableId") REFERENCES "GeneratedTable"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
