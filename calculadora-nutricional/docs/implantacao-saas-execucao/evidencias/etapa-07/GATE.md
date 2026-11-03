# Gate da Etapa 07 — Webhooks e reconciliação

Data: 27/08/2026
Resultado: `GATE: APROVADO NO ESCOPO LOCAL`
Banco: `127.0.0.1:54329/calculadora_nutricional`
Provider financeiro acessado: nenhum

## Evidência determinística

| Cenário | Resultado |
| --- | --- |
| 10 entregas do mesmo event ID | 1 linha de inbox |
| processamento concorrente 10x | 1 charge e nenhum efeito duplicado |
| evento fora de ordem | `CONFIRMED` não regrediu para `PENDING` |
| falha antes do mapping | `FAILED`, depois replay para `PROCESSED` |
| evento desconhecido | `IGNORED` sem interromper a fila |
| reconciliação por checkout | 1 pagamento reaplicado idempotentemente |
| ativação | somente `PAYMENT_CONFIRMED/RECEIVED`, nunca redirect/checkout |
| payload | campos extras/PII descartados pela projeção allowlist |

## Gates automatizados

| Gate | Resultado |
| --- | --- |
| `npm run check` | aprovado; lint, tipos, boundaries, 109 testes e Prisma validate |
| `npm run security:check` | aprovado; source checks e 0 vulnerabilidades `moderate+` |
| `npm run test:migrations` | aprovado; 46 tabelas, 26 enums, 29 migrations, sem drift |
| `npm run verify:billing-webhooks:runtime` | aprovado no PostgreSQL local |
| `npm run build` | aprovado; rota `/api/webhooks/asaas` e 36 páginas |
| `git diff --check` | aprovado |

O primeiro dry-run detectou truncamento PostgreSQL do nome de um índice com mais
de 63 bytes. Uma migration forward-fix renomeou o índice para nome curto
explícito; clean install e upgrade foram repetidos sem drift.

## Limite declarado

Sem `ASAAS_WEBHOOK_AUTH_TOKEN` e chave Sandbox não houve entrega externa nem
verificação do painel/queue Asaas. Isso permanece requisito bloqueante da Etapa
12 e não autoriza uso de produção.
