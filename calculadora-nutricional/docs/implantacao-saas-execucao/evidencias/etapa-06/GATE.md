# Gate da Etapa 06 — Checkout e assinaturas

Data: 27/08/2026
Resultado: `GATE: APROVADO NO ESCOPO LOCAL`
Banco: `127.0.0.1:54329/calculadora_nutricional`
Provider financeiro acessado: nenhum

## Evidência funcional e de segurança

| Cenário | Resultado |
| --- | --- |
| checkout hospedado | contrato recorrente `CREDIT_CARD` e payload mockado |
| preço e ciclo | relidos de versão publicada; valor em centavos |
| concorrência/retry | tentativa ativa reutilizada; uma chamada lógica |
| retorno de checkout | não ativa assinatura e não cria cobrança |
| assinatura inicial | `INCOMPLETE` até confirmação financeira |
| cross-tenant | cancelamento com organização distinta negado antes do provider |
| POST ambíguo | `OUTCOME_UNKNOWN`; nova tentativa bloqueada |
| host do link | somente host HTTPS oficial do ambiente |
| cartão | PAN, CVV e token nunca entram no backend SoIZI |

## Gates automatizados

| Gate | Resultado |
| --- | --- |
| `npm run check` | aprovado; lint, tipos, boundaries, 104 testes e Prisma validate |
| `npm run security:check` | aprovado; source checks e 0 vulnerabilidades `moderate+` |
| `npm run test:migrations` | aprovado; 46 tabelas, 26 enums, 27 migrations, sem drift |
| `npm run verify:billing-checkout:runtime` | aprovado no PostgreSQL local |
| `npm run build` | aprovado; Next.js 16.2.12 e 36 páginas |
| `git diff --check` | aprovado |

O runtime comprovou uma criação, reuso idempotente, nenhuma charge antes do
webhook, isolamento tenant e bloqueio de retry ambíguo. O fixture comercial é
reutilizável e fica arquivado/inativo após o teste para não aparecer no catálogo.

## Limite declarado

A divergência oficial entre `customer` no guia e sua ausência no OpenAPI só pode
ser resolvida com a chave Sandbox. Esse contrato e toda homologação externa ficam
obrigatórios na Etapa 12; produção e Neon não foram acessados.
