# Gate da Etapa 04 — Entitlements e limites

Data: 26/08/2026
Resultado: `GATE: APROVADO`
Ambiente: somente local
Banco validado: `127.0.0.1:54329/calculadora_nutricional` (PostgreSQL 16.13)

## Migration e compatibilidade

| Evidência | Resultado |
| --- | --- |
| Instalação limpa | 44 tabelas, 23 enums, 25 migrations, 0 FKs inválidas |
| Upgrade com dados | dados sintéticos de produto e billing preservados |
| Política migrada | organizações preexistentes marcadas explicitamente como `v1` |
| Política nova | default do schema e banco igual a `v2` |
| Grants/overrides | tabelas, índices e constraints aplicados |
| Drift Prisma | nenhum |

## Precedência e segurança

| Cenário | Resultado |
| --- | --- |
| organização `v2` sem fonte | negada por `DEFAULT_DENY` |
| organização `v1` sem fonte | compatibilidade explícita `LEGACY_POLICY_V1` |
| grant temporal ativo | habilitado por `GRANT` |
| subscription em versão publicada | habilitada por `PLAN_VERSION` |
| nova versão publicada | subscription na versão 1 manteve composição histórica |
| override de bloqueio | venceu plano e grant |
| organização inativa | bloqueio vence todas as demais fontes |
| origem do tenant | sessão ou API token; frontend não concede entitlement |

## Concorrência de seats

Configuração do smoke: limite 2, uso inicial 1 e duas tentativas concorrentes de
membership. Cada transação adquiriu o advisory lock da organização antes de
recontar o uso. Resultado persistido:

```json
{
  "concurrentSeats": ["created", "denied"],
  "finalActiveSeats": 2
}
```

Todas as fixtures do smoke foram removidas do banco local ao final, inclusive em
caso de falha.

## Gates automatizados

| Gate | Resultado |
| --- | --- |
| `npm run check` | aprovado; lint, tipos, boundaries, Prisma e 84/84 testes |
| `npm run security:check` | aprovado; 0 vulnerabilidades `moderate+` |
| `npm run test:migrations` | aprovado em clean install e upgrade |
| `npm run verify:entitlements:runtime` | aprovado, incluindo concorrência real |
| `npm run build` | aprovado; Next.js 16.2.12 e 35 páginas |
| `git diff --check` | aprovado |
| schema local | 25 migrations, atualizado |

Todos os comandos de banco receberam `POSTGRES_PRISMA_URL`,
`POSTGRES_URL_NON_POOLING` e `DATABASE_URL` apontadas explicitamente para
loopback. O Neon não foi consultado nem alterado nesta etapa.

## Limites declarados

- consumo periódico e reset de quota dependem do ledger da Etapa 10;
- organizações migradas preservam a política `v1` até conversão controlada;
- qualquer futuro fluxo de convite que passe a persistir `PENDING` deve reutilizar
  o mesmo lock/enforcer antes da criação;
- a Etapa 05 pode iniciar localmente.
