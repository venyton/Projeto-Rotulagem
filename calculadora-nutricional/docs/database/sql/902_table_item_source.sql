-- Espelha prisma/migrations/20260727120000_add_table_item_source/migration.sql.
-- Use somente em banco legado quando o deploy do Prisma não puder ser executado.
ALTER TABLE "TableItem"
ADD COLUMN IF NOT EXISTS "source" TEXT;
