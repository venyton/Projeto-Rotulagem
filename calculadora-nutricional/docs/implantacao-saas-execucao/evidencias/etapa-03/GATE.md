# Gate da Etapa 03 — Catálogo comercial

Data: 25/08/2026
Resultado: `GATE: APROVADO`
Ambiente: somente local
Banco validado: `127.0.0.1:54329/calculadora_nutricional`

## Migration e compatibilidade

| Evidência | Resultado |
| --- | --- |
| Instalação limpa | 42 tabelas, 22 enums, 24 migrations, 0 FKs inválidas |
| Upgrade com dados | usuário, tenant, plano, módulo, subscription, billing e marketing preservados |
| Backfill comercial | versão 1 publicada, feature, preço e subscription vinculada |
| Feature definitions | 11 chaves estáveis |
| Triggers de imutabilidade | 3 instalados e exercitados |
| Drift Prisma | nenhum |

O teste de upgrade tentou alterar número de versão, feature e valor de preço já
publicados; as três operações foram rejeitadas e os valores originais permaneceram.

## Segurança e comportamento real

| Cenário | Resultado |
| --- | --- |
| `/api/admin/catalog` anônimo | `401`, `Cache-Control: no-store` |
| endpoint com usuário tenant comum | `403`, `Cache-Control: no-store` |
| `/admin/catalog` usuário tenant comum | redirecionado para `/dashboard` |
| endpoint com `PRODUCT_ADMIN` | `200`, 11 features |
| criação de draft | plano + versão + 6 features + 2 preços em transação |
| publicação | versão 1 `PUBLISHED`, plano `ACTIVE`, audit event |
| fixtures | plano, versão, features, preços, 26 logs, assignment e 2 usuários removidos localmente |

## Gates automatizados

| Gate | Resultado |
| --- | --- |
| `npm run check` | aprovado; lint, tipos, boundaries, Prisma e 70/70 testes |
| `npm run security:check` | aprovado; 0 vulnerabilidades `moderate+` |
| `npm run test:migrations` | aprovado em clean install e upgrade |
| `npm run build` | aprovado; Next.js 16.2.12 e 35 páginas |
| `git diff --check` | aprovado |
| schema local | 24 migrations, atualizado |

Todos os comandos Prisma receberam as três URLs locais explicitamente. Nenhuma
migration ou escrita foi executada no Neon.

## Interface e acessibilidade

- `catalog-desktop-light.png`
- `catalog-mobile-dark.png`
- `catalog-plan-mobile-dark.png`

Verificados desktop 1440 px, mobile 390 px, light/dark, formulários, feedback,
consequência da publicação, reflow e ausência de overflow. Axe-core 4.12.1:
0 violations e 0 incomplete; console sem erros.

## Limites

- o novo catálogo não ativa entitlements por si só;
- Asaas, checkout, proration e cobrança não foram inferidos;
- coexistência com campos legados está em `RISK-006`;
- a Etapa 04 pode iniciar localmente.
