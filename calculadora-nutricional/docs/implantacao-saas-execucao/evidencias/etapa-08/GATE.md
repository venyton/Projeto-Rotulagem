# Gate da Etapa 08 — Administração de clientes

Data: 27/08/2026
Resultado: `GATE: APROVADO NO ESCOPO LOCAL`
Banco: `127.0.0.1:54329/calculadora_nutricional`
Neon acessado: não
Provider financeiro acessado: nenhum

## Evidência determinística

| Cenário | Resultado |
| --- | --- |
| projeção administrativa | somente metadados selecionados; conteúdo do tenant ausente |
| documento | somente `CPF/CNPJ •••• 1234` |
| status | apenas `ACTIVE ↔ SUSPENDED`, motivo obrigatório |
| isolamento | alteração no tenant A não modificou o tenant B |
| auditoria | exatamente um evento com before/after sanitizado |
| menor privilégio | papel apenas com `organizations.read` não atualizou |
| credencial ausente | botão de reconciliação desabilitado e nenhuma chamada externa |

## Gates automatizados e visuais

| Gate | Resultado |
| --- | --- |
| `npm run check` | aprovado; lint, tipos, boundaries, 113 testes e Prisma validate |
| `npm run test:platform-iam` | aprovado; 9 testes, incluindo 4 novos do domínio administrativo |
| `npm run security:check` | aprovado após correção da fronteira domain/Prisma; 0 vulnerabilidades `moderate+` |
| `npm run test:migrations` | aprovado; 46 tabelas, 26 enums, 29 migrations, clean/upgrade sem drift |
| `npm run verify:customer-admin:runtime` | aprovado no PostgreSQL local |
| `npm run build` | aprovado; 38 páginas, incluindo as três rotas administrativas novas |
| browser desktop e 390 px | lista e detalhe renderizados; sem overlay e sem overflow horizontal |
| `git diff --check` | aprovado |

## Limite declarado

Não houve chamada Asaas nem teste de reconciliação real. Isso permanece no gate
final da Etapa 12 conforme DEC-011. A fixture temporária de browser e seus logs
foram removidos do PostgreSQL local após a verificação.
