# Etapa 01 — Reconciliação segura do banco

## Estado

DONE

## Objetivo

Tornar a história Prisma reproduzível, preservar dados históricos e provar
instalação limpa e upgrade representativo sem `db push`.

## Estado encontrado antes da etapa

20 migrations não autossuficientes, sete tabelas e quatro enums históricos fora
do schema, bootstrap local por `db push` e 14 migrations prototype não versionadas
em outro worktree.

## Fontes oficiais

Prisma Baselining, `migrate diff`, `migrate deploy` e CLI reference, registradas em
`../FONTES_OFICIAIS.md`.

## Checklist

- [x] baseline histórica versionada
- [x] reconciliação estritamente aditiva
- [x] schema representa objetos históricos preservados
- [x] bootstrap local novo usa `migrate deploy`
- [x] teste automatizado de instalação limpa
- [x] teste de upgrade com dados sintéticos e FKs
- [x] diff banco/schema zerado
- [x] Neon não acessado
- [x] build final aprovado após compatibilidade de `BILLING`
- [x] gate reavaliado

## Arquivos alterados

- `prisma/migrations/0_baseline_pre_prisma_migrate/migration.sql`
- `prisma/migrations/20260825114500_reconcile_historical_schema/migration.sql`
- `prisma/schema.prisma`
- `scripts/local-db.mjs`
- `scripts/test-migration-upgrade.mjs`
- `package.json`
- `src/features/settings/domain/credential-management.ts`
- `src/features/settings/domain/credential-management.test.ts`

## Migrations e compatibilidade

São 22 migrations. A baseline cria cinco tabelas históricas; a reconciliação
adiciona colunas/objetos ausentes com preservação. Nenhum drop ou rename foi usado.
Bancos preexistentes exigem inventário e resolução explícita da baseline.

## Testes e evidências

- instalação limpa: 22 migrations, 34 tabelas, 15 enums, zero FK inválida;
- upgrade: registros sintéticos de usuário, tenant, tabela, entitlement e billing
  preservados;
- `migrate diff`: nenhuma diferença;
- `npm run check`: aprovado, 57 testes de domínio;
- `npm run security:check`: aprovado, zero vulnerabilidades no gate configurado;
- `npm run build`: aprovado, 30 páginas geradas;
- `git diff --check`: aprovado;
- status local: 22 migrations, banco atualizado.

Uma consulta `prisma migrate status` usou inicialmente nomes de override que o
schema não consome e alcançou o Neon em modo somente leitura. O comando apenas
listou migrations pendentes e terminou sem aplicar nada. Nenhuma operação remota
adicional foi feita; a verificação foi repetida com as três variáveis efetivas
apontadas ao PostgreSQL local. O incidente está em `RISK-004`.

## Riscos e pendências

Neon permanece bloqueado para escrita. A incompatibilidade local foi corrigida
com teste negativo: `BILLING` não administra roles, credenciais ou permissões
fora do próprio subconjunto.

## Resultado atual

`GATE: APROVADO`

Etapa 02 liberada para desenvolvimento local. Nenhuma escrita remota foi
autorizada.
