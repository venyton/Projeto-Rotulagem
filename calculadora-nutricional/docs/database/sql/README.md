# SQL do banco - ordem de execucao

## Preferido

Para ambiente normal com Prisma, rode as migrations pelo Prisma:

```bash
    cd calculadora-nutricional
npx prisma migrate deploy --schema=./prisma/schema.prisma
npx prisma generate --schema=./prisma/schema.prisma
```

## Ordem manual para DBA

Execute nesta ordem, uma vez:

1. `001_technical_sheet_imports.sql`
2. `002_technical_sheet_technical_fields.sql`
3. `003_enterprise_label_projects.sql`
4. `902_table_item_source.sql` (somente para bancos legados sem execução do Prisma)
5. `903_ingredient_search_name.sql` (somente para bancos legados sem execução do Prisma)

Esses arquivos sao copias organizadas das migrations Prisma:

- `prisma/migrations/20260513200000_add_technical_sheet_imports/migration.sql`
- `prisma/migrations/20260514110000_add_technical_sheet_technical_fields/migration.sql`
- `prisma/migrations/20260514123000_add_enterprise_label_projects/migration.sql`

Os arquivos originais continuam em `prisma/migrations/` porque o Prisma precisa deles ali.

`prisma/migrations/20260727120000_add_table_item_source/migration.sql` é a fonte canônica
da coluna `TableItem.source`. Antes de aplicar em staging ou produção, faça backup,
confira `npx prisma migrate status` e valide o histórico em `_prisma_migrations`.

`prisma/migrations/20260730140000_add_ingredient_search_name/migration.sql` é a fonte
canônica de `Ingredient.searchName` e `CustomIngredient.searchName`, usados pela busca
acentuação-insensível com índices trigram. A coluna é mantida pelas escritas da aplicação.

## Scripts avulsos antigos

Estes scripts existem para bancos antigos que precisam apenas das colunas de estado da tela em `GeneratedTable`:

- `900_generated_table_ui_state_dynamic_schema.sql`: detecta `public` ou `calculadora_nutricional`.
- `901_generated_table_ui_state_fixed_schema.sql`: usa fixo o schema `calculadora_nutricional`.

Nao rode `900` ou `901` se o `001_technical_sheet_imports.sql` ja foi aplicado, porque o `001` ja cria as mesmas colunas em `GeneratedTable`.
