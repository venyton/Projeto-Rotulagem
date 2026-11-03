# Evidência do gate da Etapa 01

Data: 25/08/2026
Ambiente: PostgreSQL local em loopback; Next.js 16.2.12; Prisma 5.22.0

| Verificação | Resultado |
| --- | --- |
| `npm run check` | aprovado; lint, typecheck, validação, 57 testes e Prisma validate |
| `npm run security:check` | aprovado; checks de fonte e 0 vulnerabilidades no nível configurado |
| `npm run test:migrations` | aprovado; instalação limpa e upgrade representativo |
| Instalação limpa | 22 migrations, 34 tabelas, 15 enums e 0 FK inválida |
| Upgrade sintético | dados preservados, 0 recurso sem tenant e 0 FK inválida |
| `migrate diff` | nenhuma diferença |
| `npm run build` | aprovado; TypeScript e 30 páginas |
| `git diff --check` | aprovado |
| Banco local corrente | 22 migrations; schema atualizado |

O primeiro build revelou incompatibilidade do valor histórico `BILLING`. A
correção foi validada por teste negativo e o gate inteiro foi repetido.

`GATE: APROVADO`
