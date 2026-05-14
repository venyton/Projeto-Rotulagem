-- 900_generated_table_ui_state_dynamic_schema.sql
-- Script avulso antigo: adiciona estado completo da UI em GeneratedTable.
-- Detecta automaticamente se a tabela esta em public ou calculadora_nutricional.
-- Nao executar se 001_technical_sheet_imports.sql ja foi aplicado.

BEGIN;

DO $$
DECLARE
  target_schema text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'GeneratedTable'
  ) THEN
    target_schema := 'public';
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'calculadora_nutricional'
      AND table_name = 'GeneratedTable'
  ) THEN
    target_schema := 'calculadora_nutricional';
  ELSE
    RAISE EXCEPTION 'Tabela GeneratedTable não encontrada em public nem calculadora_nutricional';
  END IF;

  EXECUTE format(
    'ALTER TABLE %I."GeneratedTable"\n'
    || '  ADD COLUMN IF NOT EXISTS "packageContent" DOUBLE PRECISION,\n'
    || '  ADD COLUMN IF NOT EXISTS "servingsPerPackage" TEXT,\n'
    || '  ADD COLUMN IF NOT EXISTS "suggestedFoodGroup" TEXT,\n'
    || '  ADD COLUMN IF NOT EXISTS "suggestedProduct" TEXT,\n'
    || '  ADD COLUMN IF NOT EXISTS "uiState" JSONB;',
    target_schema
  );
END
$$;

COMMIT;
