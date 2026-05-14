# Persistência Completa da Tela de Edição no Banco

## Objetivo
Garantir que, ao reabrir uma tabela já salva, toda a configuração volte exatamente como estava na tela.

## Arquivo SQL para aplicar
- `docs/database/sql/900_generated_table_ui_state_dynamic_schema.sql`

Se o banco ja recebeu `docs/database/sql/001_technical_sheet_imports.sql`, nao rode este script separado. O `001` ja cria as mesmas colunas em `GeneratedTable`.

## O que o SQL adiciona na tabela `GeneratedTable`
1. `packageContent` (`DOUBLE PRECISION`)
- Conteúdo da embalagem informado na tela (g/ml).

2. `servingsPerPackage` (`TEXT`)
- Declaração final de porções por embalagem usada na tabela.

3. `suggestedFoodGroup` (`TEXT`)
- Grupo de alimentos selecionado no bloco de sugestões.

4. `suggestedProduct` (`TEXT`)
- Produto sugestão selecionado.

5. `uiState` (`JSONB`)
- Snapshot do estado da UI (filtros, modos, opções de exportação, conformidade etc.).

## Por que `uiState` em JSONB
- Evita criar dezenas de colunas para estado de interface.
- Permite evoluir campos de UI sem migração a cada ajuste pequeno.
- Mantém o dado principal da tabela em colunas explícitas e o estado de tela em payload estruturado.

## Como aplicar (DBA)
1. Executar o SQL em ambiente alvo.
2. Validar colunas criadas com query de `information_schema` (já comentada no final do `.sql`).

## Como a aplicação passa a usar
1. `saveTable` grava:
- campos estruturados (`packageContent`, `servingsPerPackage`, `suggestedFoodGroup`, `suggestedProduct`)
- `uiState` completo.

2. `edit/[id]` devolve esses campos no `initialData`.

3. `TableGenerator` reidrata da seguinte ordem:
- banco (`initialData.uiState` e campos explícitos),
- fallback local (`localStorage`) quando não houver snapshot no banco,
- inferência por título/medida como último fallback.

## Observações
- Script é idempotente (`ADD COLUMN IF NOT EXISTS`).
- Não remove nem altera dados existentes.
- Se a tabela já tiver essas colunas, o script não quebra.
