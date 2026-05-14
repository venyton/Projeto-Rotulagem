-- 901_generated_table_ui_state_fixed_schema.sql
-- Objetivo: adicionar colunas para persistir todo o estado de configuração da tabela
-- Banco alvo: PostgreSQL
-- Schema alvo: calculadora_nutricional
-- Tabela alvo: "GeneratedTable"
-- Nao executar se 001_technical_sheet_imports.sql ja foi aplicado.

BEGIN;

ALTER TABLE IF EXISTS "calculadora_nutricional"."GeneratedTable"
  ADD COLUMN IF NOT EXISTS "packageContent" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "servingsPerPackage" TEXT,
  ADD COLUMN IF NOT EXISTS "suggestedFoodGroup" TEXT,
  ADD COLUMN IF NOT EXISTS "suggestedProduct" TEXT,
  ADD COLUMN IF NOT EXISTS "uiState" JSONB;

COMMIT;

-- Verificação rápida pós-execução
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'calculadora_nutricional'
--   AND table_name = 'GeneratedTable'
-- ORDER BY ordinal_position;
