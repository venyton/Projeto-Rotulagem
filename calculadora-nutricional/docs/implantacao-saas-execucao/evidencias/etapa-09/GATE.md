# Gate da Etapa 09 — Cupons, grants e overrides

Data: 27/08/2026
Resultado: `GATE: APROVADO NO ESCOPO LOCAL`
Banco: `127.0.0.1:54329/calculadora_nutricional`
Neon acessado: não
Provider financeiro acessado: fake local

## Evidência determinística

| Cenário | Resultado |
| --- | --- |
| código | normalização ASCII uppercase e unique constraint |
| corrida de redemption | 2 concorrentes, exatamente 1 aceito |
| snapshot | 10.000 − 2.000 = 8.000 centavos |
| provider fake | recebeu exatamente 8.000 centavos |
| grant ativo | fonte efetiva `GRANT` |
| grant expirado | ignorado, resultado `DEFAULT_DENY` no fixture |
| checkout/webhook anteriores | runtimes das Etapas 06 e 07 aprovados após a evolução |

## Gates

| Gate | Resultado |
| --- | --- |
| `npm run check` | aprovado; 118 testes e Prisma validate |
| `npm run security:check` | aprovado; 0 vulnerabilidades `moderate+` |
| `npm run test:migrations` | aprovado; 51 tabelas, 29 enums, 30 migrations e sem drift |
| `npm run verify:commercial-benefits:runtime` | aprovado no PostgreSQL local |
| regressões de checkout/webhook | aprovadas |
| `npm run build` | aprovado; 40 páginas |
| browser desktop e 390 px | cupons/grants renderizados, sem overflow ou overlay |
| `git diff --check` | aprovado |

## Limite declarado

Sem chave Sandbox, o valor com desconto foi validado por provider fake e banco
local. A confirmação do payload real Asaas permanece no gate final da Etapa 12.
As ações HIGH receberão step-up curto na Etapa 11; nesta etapa já exigem
permission específica, confirmação, motivo e auditoria.
