# SoIZI Control Plane — Relatório de Reconciliação de Banco da Etapa 1

**Data:** 25/08/2026

**Branch:** `feat/padronizacao-interface-e-governanca`

**Commit-base:** `de730f82bae1b0c225f5863b8d7c663a8e09abdd`

**Ambiente executado:** PostgreSQL local `127.0.0.1:54329`

**Ambientes não acessados:** Neon, Asaas e Cora

## 1. Resultado executivo

**Etapa 1 aprovada para desenvolvimento local.**

A história Prisma tornou-se reproduzível desde banco vazio, o bootstrap local deixou de depender de `db push`, o schema passou a representar os objetos históricos preservados e um teste automatizado comprovou instalação limpa e upgrade com dados sintéticos representativos.

O gate remoto permanece **AMARELO**: antes de qualquer escrita no Neon são obrigatórios autorização específica, inventário read-only, backup válido e tratamento de eventual migration prototype. Essa ressalva não bloqueia a Etapa 2 local porque nenhuma dependência remota ou financeira será ativada.

## 2. Divergências encontradas

| ID | Divergência | Estado anterior | Resolução |
| --- | --- | --- | --- |
| DB-001 | ausência de baseline | primeira migration alterava tabelas inexistentes | `0_baseline_pre_prisma_migrate` |
| DB-002 | `db push` mascarava replay | local materializava só o schema atual | local novo usa `migrate deploy` |
| DB-003 | sete tabelas históricas fora do schema | replay criava 34 tabelas; schema declarava 26 models | models históricos restaurados e reconciliados |
| DB-004 | quatro enums históricos fora do schema | diff sugeria drops perigosos | enums e valores preservados |
| DB-005 | colunas atuais sem migration | reset token, açúcar adicionado e nutrientes customizados só existiam via push | migration aditiva com `ADD COLUMN IF NOT EXISTS` |
| DB-006 | índices com opclass/nome truncado | `migrate diff` reportava drift | opclasses GIN e nomes físicos mapeados no schema |
| DB-007 | 14 migrations prototype não versionadas | presentes apenas em outro worktree e no antigo banco compartilhado | classificadas como lineage não oficial; não copiadas |
| DB-008 | provider histórico Stripe/Manual | incompatível com arquitetura Asaas | preservado como legado, sem ativação; evolução fica nas Etapas 5–7 |

## 3. Artefatos entregues

- `prisma/migrations/0_baseline_pre_prisma_migrate/migration.sql`
- `prisma/migrations/20260825114500_reconcile_historical_schema/migration.sql`
- `prisma/schema.prisma` reconciliado
- `scripts/local-db.mjs` sem bootstrap por `db push`
- `scripts/test-migration-upgrade.mjs`
- script npm `test:migrations`
- `docs/implantacao-saas/adrs/ADR-001-RECONCILIACAO-HISTORICO-PRISMA.md`
- atualização contínua do diário `08_DIARIO_IMPLEMENTACAO_E_EVIDENCIAS.md`

## 4. Evidência de instalação limpa

O teste criou um PostgreSQL descartável, executou `prisma migrate deploy` desde zero e comparou o resultado ao schema atual.

| Evidência | Resultado |
| --- | ---: |
| Migrations aplicadas | 22 |
| Tabelas públicas | 34 |
| Enums públicos | 15 |
| FKs inválidas | 0 |
| `migrate status` | atualizado |
| `migrate diff` | nenhuma diferença |

## 5. Evidência de upgrade com dados

O segundo banco descartável iniciou somente com a baseline, recebeu dados no formato anterior ao Prisma Migrate, aplicou as 20 migrations históricas, recebeu objetos representativos do estado legado e então aplicou a reconciliação.

| Dado/invariante | Antes | Depois | Resultado |
| --- | ---: | ---: | --- |
| Usuário histórico | 1 | 1 | preservado |
| Tabela nutricional | 1 | 1 | preservada |
| Item da tabela | 1 | 1 | preservado |
| Ingrediente customizado | 1 | 1 | preservado |
| Membership gerada | 1 | 1 | preservada |
| Recurso sem `organizationId` | 0 | 0 | fail-closed mantido |
| Entitlement com limite 321 | 1 | 1 | preservado |
| Plano com preço 1234 | 1 | 1 | preservado |
| Billing customer | 1 | 1 | preservado |
| Subscription ativa | 1 | 1 | preservada |
| Webhook legado | 1 | 1 | preservado |
| Evento de marketing | 1 | 1 | preservado |
| FKs inválidas | 0 | 0 | integridade mantida |

Todos os dados são sintéticos e locais. Nenhum dado real foi lido, migrado ou alterado.

## 6. Banco local corrente

Após finalizar a migration, apenas `calculadora_nutricional` foi recriado com a autorização já concedida pelo usuário. O banco final foi construído pelas 22 migrations, sem `db push`.

- datasource: `127.0.0.1:54329/calculadora_nutricional`;
- estado: atualizado;
- dados de domínio: vazio;
- Neon: não acessado.

## 7. Segurança e compatibilidade

- Nenhum drop ou rename destrutivo.
- Nenhuma enumeração perdeu valores.
- Nenhum objeto prototype foi promovido silenciosamente.
- O script local recusa host/porta fora do loopback configurado.
- Banco não vazio sem `_prisma_migrations`, histórico falho ou baseline incompleta interrompe o processo sem reset automático.
- A existência de model legado não ativa billing, entitlement ou permissão.
- `OrganizationRole.BILLING` e módulos legados permanecem somente para compatibilidade de dados.

## 8. Gate

### Desenvolvimento local

- [x] relatório de divergência histórica
- [x] ADR de reconciliação
- [x] baseline versionada
- [x] migration aditiva de convergência
- [x] instalação limpa por migrations
- [x] teste de upgrade representativo
- [x] contagens e FKs preservadas
- [x] diff banco/schema zerado
- [x] nenhum dado real perdido

**VERDE — pode avançar para a Etapa 2 local.**

### Ambiente remoto

- [ ] autorização explícita
- [ ] inventário read-only
- [ ] backup válido
- [ ] confirmação de ausência ou tratamento da lineage prototype
- [ ] dry-run/release review

**AMARELO — nenhuma migration remota autorizada.**

## 9. Próxima etapa

Implementar a fundação do IAM interno e o shell `/admin` com autorização server-side própria, auditoria de acesso e `INTERNAL_MASTER_EMAILS` restrito a bootstrap/break-glass. Trabalho visual exigirá a skill shadcn e a referência `ui-autoexplicativa.md` antes de qualquer página ser construída.
