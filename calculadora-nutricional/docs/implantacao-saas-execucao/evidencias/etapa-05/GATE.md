# Gate da Etapa 05 — Asaas Sandbox e adapter

Data: 26/08/2026
Resultado: `GATE: APROVADO NO ESCOPO LOCAL`
Ambiente de banco: somente local
Banco: `127.0.0.1:54329/calculadora_nutricional`
Provider financeiro acessado: nenhum

## Implementação validada localmente

| Evidência | Resultado |
| --- | --- |
| interface provider-neutral | aprovada |
| configuração host/key | Sandbox derivado; mismatch e produção acidental negados |
| adapter HTTP | métodos, headers, body, resposta e erros testados |
| customer mapping | lease, busca prévia, external reference e auditoria sanitizada |
| concorrência | 1 criação lógica para 2 chamadas simultâneas |
| POST ambíguo | consulta e reconciliação; nenhum retry cego |
| diagnóstico sem chave | `sandbox`, `not_configured`, nenhuma rede |
| migration | 44 tabelas, 24 enums, 26 migrations, sem drift |
| upgrade | mapping Stripe histórico preservado como `ACTIVE` |

## Gates automatizados

| Gate | Resultado |
| --- | --- |
| `npm run check` | aprovado; 97/97 testes |
| `npm run security:check` | aprovado; 0 vulnerabilidades `moderate+` |
| `npm run test:migrations` | aprovado em clean install e upgrade |
| `npm run verify:billing-mapping:runtime` | aprovado no PostgreSQL local |
| `npm run diagnose:asaas` | `not_configured`, sem chamada externa |
| `npm run build` | aprovado; 35 páginas |
| `git diff --check` | aprovado |
| `npm run verify:asaas:sandbox` | bloqueado: chave Sandbox ausente |

## Homologação externa diferida

Executar com `ASAAS_ENV=sandbox` e chave `$aact_hmlg_...` fornecida por variável
de ambiente segura. O script criará customer fictício, consultará por ID e
`externalReference` e removerá a fixture em `finally`. Somente a evidência
sanitizada será persistida.

Por decisão humana explícita de 26/08/2026, essa homologação foi transferida
para o gate final da Etapa 12 e não bloqueia as implementações locais seguintes.
Produção financeira e Neon permanecem fora do escopo autorizado.
