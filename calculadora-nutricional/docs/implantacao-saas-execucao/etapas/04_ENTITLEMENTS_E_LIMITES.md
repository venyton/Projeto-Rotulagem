# Etapa 04 — Entitlements e limites

## Estado

DONE

## Objetivo

Resolver centralmente o acesso efetivo da organização a features, quotas e seats,
sem confiar no frontend ou espalhar comparações com nome de plano.

## Estado encontrado

Entitlements legados ausentes eram sintetizados como habilitados durante o login.
O acesso por módulo era lido em serviços diferentes e o limite de assentos não
era conferido atomicamente nas mutações de membership.

## Implementação

- migration aditiva `20260825203500_add_feature_entitlement_resolution`;
- `OrganizationFeatureGrant` e `OrganizationFeatureOverride`, com validade,
  motivo, origem, ator e constraints de limite;
- política por organização: dados preexistentes ficam explicitamente em `v1` e
  novas organizações nascem em `v2`;
- resolvedor server-only com precedência: organização inativa, override, grant,
  versão do plano da subscription, entitlement legado, compatibilidade `v1` e
  deny-by-default `v2`;
- trial vencido, grant expirado e override expirado são ignorados em tempo real;
- módulos do dashboard, endpoint de participantes e autenticação por API token
  consomem a mesma resolução efetiva;
- avaliador genérico recebe entitlement, limite, uso e incremento solicitado;
- seats contam owner/memberships `active` e convites `PENDING` não expirados;
- criação, vínculo e reativação de membro adquirem
  `pg_advisory_xact_lock` por organização e conferem capacidade dentro da mesma
  transação `ReadCommitted`;
- erro de capacidade volta à interface como estado explicativo, sem remover ou
  suspender membros automaticamente.

## Compatibilidade e isolamento

Organizações migradas ficam em política `v1`, sem default implícito escondido:
a origem da decisão é `LEGACY_POLICY_V1`. A política `v2` nega feature sem plano,
grant, override habilitador ou entitlement legado explícito. O `organizationId`
vem de sessão/token e nunca de uma decisão do cliente.

Uma subscription continua presa ao seu `planVersionId`. O smoke publicou uma
versão 2 com composição diferente e comprovou que o cliente ligado à versão 1
manteve sua feature histórica.

## Seats e quotas

A regra de seats é única: memberships ativas mais convites pendentes ainda
válidos. A prova concorrente partiu de uso 1 e limite 2; duas inclusões
simultâneas produziram uma criação e uma negação, com uso final 2.

Esta etapa entrega a resolução do limite e a fronteira genérica de enforcement.
Persistência de consumo periódico, `resetAt` e agregação mensal são mantidos para
a Etapa 10, porque ainda não existe ledger de uso autoritativo. Nenhum reset de
quota foi inventado nesta etapa.

## Testes

- 8 testes de precedência, expiração, organização inativa e compatibilidade;
- 6 testes de limite, fronteira, isolamento e contagem de seats;
- smoke persistido de deny-by-default, compatibilidade, grant, plano,
  grandfathering, override e concorrência;
- `npm run check`: 84/84 testes;
- `npm run security:check`: zero vulnerabilidades `moderate+`;
- migrations: instalação limpa e upgrade com 44 tabelas, 23 enums e 25
  migrations, sem drift ou FK inválida;
- `npm run build`: 35 páginas;
- `git diff --check`: aprovado.

## Fontes oficiais

PostgreSQL 16 para advisory locks, snapshots `ReadCommitted` e
`pg_advisory_xact_lock`; Prisma para transações/níveis de isolamento; OWASP para
deny-by-default. URLs e impacto estão em `../FONTES_OFICIAIS.md`.

## Resultado

`GATE: APROVADO` em 26/08/2026. Evidências em
`../evidencias/etapa-04/GATE.md`.
