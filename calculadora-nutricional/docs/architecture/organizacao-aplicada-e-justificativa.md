# Organizacao aplicada e justificativa

Atualizado em: 14/05/2026.

Este documento resume a organizacao atual do projeto e o motivo das principais escolhas. A diretriz continua a mesma: melhorar manutencao sem perder regra de negocio existente.

## Objetivo

- Deixar cada contexto funcional em uma pasta previsivel.
- Separar regra de negocio de composicao de rota.
- Evitar SQL e documentos soltos.
- Preservar migrations Prisma onde o Prisma espera encontrar.
- Manter docs operacionais em portugues e faceis de executar.

## Organizacao por dominio

O codigo de produto fica em `src/features/`:

```text
auth
ingredients
open-food-facts
profile
tables
technical-sheets
enterprise
i18n
```

Essa divisao deixa regra, componentes e actions proximos do contexto real do usuario.

## Rotas e orquestracao

`src/app/` concentra rotas App Router, layouts e APIs. A regra de negocio deve ficar nas features:

- calculo nutricional em `features/tables/domain`;
- persistencia de tabelas em `features/tables/actions`;
- importador de fichas tecnicas em `features/technical-sheets`;
- workspace enterprise em `features/enterprise`;
- idioma global em `features/i18n`.

## Banco e SQL

O contrato real do banco continua em:

```text
prisma/schema.prisma
prisma/migrations/
```

Os SQL para DBA foram organizados em:

```text
docs/database/sql/
```

Ordem manual:

1. `001_technical_sheet_imports.sql`
2. `002_technical_sheet_technical_fields.sql`
3. `003_enterprise_label_projects.sql`

Os scripts `900` e `901` ficaram como apoio para bancos antigos que precisam apenas das colunas de estado da UI em `GeneratedTable`.

## Documentacao

Estrutura atual:

```text
docs/README.md
docs/system/
docs/architecture/
docs/operations/
docs/database/sql/
docs/references/
docs/reports/
docs/documento-de-commits.md
```

O arquivo `.docx` de formatacao de tabela foi movido para `docs/references/formatacao-tabela-nutricional/`, porque e material de referencia, nao guia operacional.

## O que foi preservado

- Regras de calculo nutricional.
- Regras regulatórias ja existentes.
- Fluxo de tabelas salvas.
- Fluxo de ingredientes customizados.
- Migrations Prisma nas pastas originais.
- Documento de commits no caminho usado pelo fluxo operacional.

## Beneficio pratico

Com essa organizacao, um novo ajuste tende a cair em um dos lugares abaixo:

- regra de calculo: `src/features/tables/domain`;
- tela ou componente de tabela: `src/features/tables/components`;
- ficha tecnica por IA: `src/features/technical-sheets`;
- mercado internacional ou aprovacao enterprise: `src/features/enterprise`;
- banco: `prisma/` e `docs/database/sql/`;
- guia de operacao: `docs/operations/`;
- decisao arquitetural: `docs/architecture/`.

Conclusao: a estrutura atual reduz arquivo solto, deixa o banco mais facil de aplicar manualmente e mantem o projeto navegavel para evolucao.
