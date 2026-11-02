# ADR-001 — Reconciliação do histórico Prisma e dos objetos legados

**Status:** aceito para desenvolvimento local  
**Data:** 25/08/2026  
**Escopo remoto:** pendente de autorização, inventário read-only e backup  
**Decisores:** arquitetura SoIZI e implementação Codex

## Contexto

A pasta `prisma/migrations` começava em `20260513200000_add_technical_sheet_imports`, mas essa migration altera cinco tabelas que não eram criadas por nenhum SQL versionado. Por isso, um PostgreSQL vazio não podia executar `prisma migrate deploy`; o bootstrap local contornava a lacuna com `prisma db push` e marcava migrations como aplicadas.

Além disso, a migration `20260515120000_add_saas_billing_modules_marketing` cria sete tabelas e quatro enums de billing/marketing que haviam sido removidos do `schema.prisma` sem migration de remoção. O replay histórico e o schema atual, portanto, convergiam para estados diferentes.

Um terceiro estado foi localizado no worktree histórico `/home/paz/projetos/Projeto-Rotulagem`: 14 migrations não rastreadas, com 29 models adicionais de IAM, billing, configuração e uso. Esses arquivos não aparecem em `git log --all`, usam Stripe como provider único e não podem ser tratados como autoridade da arquitetura Asaas atual.

## Fontes oficiais

- Prisma — Baselining a database: https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining
- Prisma — `migrate diff`: https://docs.prisma.io/docs/cli/migrate/diff
- Prisma — CLI reference e divergência de histórico: https://docs.prisma.io/docs/orm/reference/prisma-cli-reference
- Prisma — `migrate deploy`: https://docs.prisma.io/docs/cli/migrate/deploy

Consultadas em 25/08/2026. O projeto usa Prisma 5.22.0; portanto, o comando de diff validado localmente usa a opção vigente nessa versão, `--to-schema-datamodel`.

## Decisão

### 1. Preservar a história versionada

Os 20 diretórios preexistentes permanecem intactos. Nenhum checksum histórico foi reescrito.

### 2. Introduzir uma baseline anterior às migrations

`0_baseline_pre_prisma_migrate` cria somente as cinco tabelas pressupostas pela primeira migration:

- `User`;
- `Ingredient`;
- `CustomIngredient`;
- `GeneratedTable`;
- `TableItem`.

O SQL deriva do schema histórico do commit `eea542a60f516ec06dbbf78b1f29d7ba4fd23496`, removendo apenas as colunas que `20260513200000_add_technical_sheet_imports` declara adicionar. Essa inversão é necessária porque o snapshot Git já continha parte das colunas antes de haver migration para elas.

Em banco novo, a baseline é executada. Em banco preexistente com essas tabelas, ela deve ser marcada como aplicada com `prisma migrate resolve --applied 0_baseline_pre_prisma_migrate` antes do deploy.

### 3. Reconciliar apenas de forma aditiva

`20260825114500_reconcile_historical_schema`:

- adiciona colunas que existiam apenas no `schema.prisma`;
- restaura valores de enum históricos sem removê-los;
- preserva ou recria, quando ausentes, os sete objetos antigos de billing/marketing;
- restaura índices e FKs desses objetos;
- não executa `DROP`, rename, conversão destrutiva nem backfill financeiro.

### 4. Manter os objetos históricos modelados

Os objetos abaixo voltam ao `schema.prisma` para que o schema declarativo represente a história efetivamente reproduzível:

| Objeto histórico | Classificação | Evolução planejada |
| --- | --- | --- |
| `Plan` | adaptar | receber versões/features/preços na Etapa 3 sem perder IDs e registros |
| `PlanModule` | compatibilidade coarse | migrar para catálogo versionado; não usar como permissão pessoal |
| `BillingCustomer` | adaptar | adicionar Asaas/ambiente e regras de mapeamento na Etapa 5 |
| `Subscription` | adaptar | tornar estado interno autoritativo e provider-agnostic na Etapa 6 |
| `BillingWebhookEvent` | depreciar depois | migrar para inbox idempotente durável na Etapa 7 |
| `MarketingKeyword` | preservar sem expansão | fora do core do Control Plane atual |
| `MarketingEvent` | preservar sem expansão | fora do core; não usar como audit log |
| `PaymentProvider` | legado | manter `STRIPE`/`MANUAL`; provider novo será introduzido de forma explícita |
| `OrganizationRole.BILLING` | legado | não concede IAM de plataforma; manter apenas para dados existentes |
| módulos `BILLING`/`MARKETING_ANALYTICS` | legado | não aparecem no catálogo operacional atual e não concedem acesso por padrão |

### 5. Não adotar as 14 migrations prototype

As migrations não rastreadas de 22–23/07/2026 são evidência histórica, não fonte de runtime. Conceitos úteis serão reimplementados nas etapas normativas, com nomes e contratos revisados. Copiá-las diretamente criaria:

- provider Stripe incompatível com Asaas;
- dois catálogos de plano concorrentes (`Plan` e `BillingPlan`);
- IAM anterior à matriz atual;
- configuração e convites fora dos gates definidos;
- história impossível de atribuir a um commit versionado.

Se um ambiente remoto contiver esses nomes em `_prisma_migrations`, o release deve parar. A reconciliação desse ambiente exige backup, inventário objeto-a-objeto e decisão humana; não se apagam registros da tabela de migrations para forçar alinhamento.

## Estados suportados

| Estado | Procedimento |
| --- | --- |
| PostgreSQL novo e vazio | `prisma migrate deploy` executa baseline e as migrations seguintes |
| Banco com as 20 migrations oficiais anteriores | marcar somente a baseline como aplicada e executar `migrate deploy` |
| Banco local antigo criado por `db push` | o guard local valida as cinco tabelas, marca a baseline e aplica a reconciliação |
| Banco com migration falha/incompleta | bloquear e investigar; nenhum reset automático |
| Banco com migrations prototype extras | bloquear release remoto e produzir plano específico com backup |

## Invariantes

1. Nenhum comando desta decisão seleciona Neon automaticamente.
2. `db push` permanece restrito pelo script a `127.0.0.1:54329` e não substitui migration.
3. Bancos inconsistentes não são resetados automaticamente.
4. A baseline nunca é executada sobre as cinco tabelas preexistentes; é marcada como aplicada.
5. A migration de reconciliação é idempotente em relação à existência dos objetos, mas seu registro Prisma continua único.
6. Objetos legados preservados não concedem entitlement, permissão ou billing ativo por existirem.

## Evidência automatizada

`npm run test:migrations` cria bancos PostgreSQL locais descartáveis e executa:

1. instalação limpa com todas as migrations;
2. comparação banco → `schema.prisma` com `migrate diff`;
3. upgrade a partir da baseline com usuário, ingrediente, tabela, item e ingrediente customizado;
4. backfill de organização/membership;
5. preservação de entitlement, plano, customer, subscription, webhook e marketing legados;
6. validação de FKs e ausência de recurso tenant-scoped sem organização;
7. limpeza dos bancos de teste mesmo em falha.

Resultado inicial: 22 migrations, 34 tabelas públicas, 15 enums, zero diff de schema, zero FK inválida e todos os registros sintéticos preservados.

## Procedimento remoto obrigatório

Nenhuma etapa abaixo foi executada no Neon.

Antes do primeiro release desta história:

1. obter autorização explícita para leitura e escrita no ambiente exato;
2. confirmar branch, commit e variáveis Prisma efetivas de forma sanitizada;
3. executar `prisma migrate status` em modo read-only;
4. listar apenas nomes/status de `_prisma_migrations`, sem dados de clientes;
5. comparar tabelas/enums/constraints com o relatório desta etapa;
6. gerar backup com cliente PostgreSQL compatível e validar `pg_restore --list`;
7. interromper se houver migration prototype, falha ou objeto incompatível;
8. marcar a baseline como aplicada;
9. executar `prisma migrate deploy` pelo fluxo de release revisado;
10. validar contagens, FKs, login, tenant context e smoke tests;
11. registrar evidências e decisão humana no diário.

## Rollback

- Não reverter migration já aplicada com `DROP`.
- Como esta etapa é aditiva e não ativa fluxos novos, rollback de código pode ignorar os novos models.
- Falha parcial exige `migrate resolve` somente após diagnóstico e forward-fix revisado.
- Objetos legados permanecem preservados até release destrutivo separado e explicitamente aprovado.

## Consequências

### Positivas

- `migrate deploy` reproduz o banco desde zero;
- schema e history convergem sem drops;
- testes de upgrade deixam de depender de `db push`;
- dados históricos permanecem disponíveis para a migração gradual do Control Plane.

### Custos e riscos residuais

- Models legados continuam visíveis no Prisma Client até sua evolução/depreciação final.
- O estado real do Neon continua desconhecido e não pode ser declarado compatível sem a etapa remota autorizada.
- As 14 migrations prototype exigem tratamento específico caso apareçam em qualquer ambiente real.
