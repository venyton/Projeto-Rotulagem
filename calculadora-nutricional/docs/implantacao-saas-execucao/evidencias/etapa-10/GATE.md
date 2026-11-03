# Gate da Etapa 10 — Métricas e consumo

Data: 27/08/2026
Resultado: `GATE: APROVADO NO ESCOPO LOCAL`
Banco do gate: `127.0.0.1:54329/calculadora_nutricional`
Provider financeiro: não acessado

## Evidência determinística

| Cenário | Resultado |
| --- | --- |
| concorrência no limite 2 | 2 aceitos; uso final 2 |
| terceiro consumo | negado por quota |
| chave repetida | `recorded=false`; contador permaneceu 2 |
| tenant B | contador independente 1 |
| período seguinte | contador reiniciou em 1 |
| origem do contador | serviços server-side; browser não aceito |

## Gates

| Gate | Resultado |
| --- | --- |
| `npm run check` | aprovado; 121 testes e Prisma validate |
| `npm run security:check` | aprovado; 0 vulnerabilidades `moderate+` |
| `npm run test:migrations` | aprovado; 53 tabelas, 29 enums, 31 migrations, upgrade histórico e sem drift |
| `npm run verify:usage-metrics:runtime` | aprovado no PostgreSQL local |
| `npm run build` | aprovado; 41 páginas |
| browser desktop/390 px | light/dark, teclado, sem overflow horizontal e com rolagem integral após correção |
| `git diff --check` | aprovado antes do registro documental final |

## Limites e incidente

Margem permanece indisponível sem custos confiáveis. Homologação Asaas continua
diferida. `RISK-012` documenta o upsert acidental e isolado de uma fixture no
Neon; após a detecção nenhum novo acesso remoto ocorreu e qualquer remediação
depende de autorização explícita.
