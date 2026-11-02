# Etapa 00 — Baseline e pesquisa

## Estado

DONE

## Objetivo

Mapear a aplicação real e impedir migrations do novo SaaS antes de compreender a
história existente.

## Estado encontrado

Next.js 16.2.12, NextAuth 4.24.15, Prisma 5.22, 26 models/11 enums, 20 migrations,
sem `/admin`, IAM de plataforma ou Asaas. A primeira migration não criava suas
tabelas-base e havia objetos históricos de billing fora do schema.

## Checklist

- [x] branch, HEAD e working tree registrados
- [x] schema e migrations mapeados
- [x] tenant isolation e autorização mapeados
- [x] entitlements, profiles e grants mapeados
- [x] allowlist master e rotas mapeadas
- [x] APIs, checks de segurança, CI e envs mapeados
- [x] billing/marketing histórico identificado
- [x] fontes oficiais registradas
- [x] nenhuma migration criada antes do gate

## Evidências

O relatório detalhado produzido antes da publicação do protocolo permanece em
`docs/implantacao-saas/10_RELATORIO_BASELINE_ETAPA_0.md`. A partir deste protocolo,
novas evidências ficam exclusivamente nesta pasta operacional.

## Resultado final

`GATE: APROVADO`

Etapa 01 liberada. Nenhuma escrita remota autorizada.
