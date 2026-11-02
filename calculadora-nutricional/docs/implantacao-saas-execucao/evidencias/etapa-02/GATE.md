# Gate da Etapa 02 — IAM interno e Control Plane

Data: 25/08/2026
Resultado: `GATE: APROVADO`
Ambiente: somente local
Banco validado: `127.0.0.1:54329/calculadora_nutricional`

## Evidência funcional e de segurança

| Cenário | Resultado |
| --- | --- |
| `/api/admin/access` anônimo | `401`, `Cache-Control: no-store` |
| `/api/admin/access` usuário tenant comum | `403`, `Cache-Control: no-store` |
| `/api/admin/access` assignment `AUDITOR` ativo | `200` |
| `/admin` usuário tenant comum | `307` para `/dashboard` |
| `/admin` assignment `AUDITOR` ativo | `200` |
| Permissão fora do assignment | negada |
| Assignment suspenso, futuro ou expirado | negado |
| Break-glass sem 2FA | negado |
| Conteúdo de clientes na UI administrativa | não exibido |

Fixtures `stage2-common-user`, `stage2-admin-user`, seu assignment e 94 logs de
teste foram removidos em transação do banco local após a verificação.

## Evidência automatizada

| Gate | Resultado |
| --- | --- |
| `npm run check` | aprovado; lint sem avisos, TypeScript válido, boundaries válidos e 62/62 testes |
| `npm run security:check` | aprovado; source checks e 0 vulnerabilidades `moderate+` |
| `npm run test:migrations` | aprovado; clean install e upgrade com dados preservados |
| Migrações | 23 aplicadas; 38 tabelas, 17 enums, 0 FKs inválidas |
| Seed IAM | 9 roles, 21 permissions, 72 grants |
| `npm run build` | aprovado; Next.js 16.2.12, 33 páginas, rotas administrativas incluídas |
| `git diff --check` | aprovado |
| Banco local | schema atualizado; 23 migrations |

Todos os comandos Prisma receberam explicitamente as três URLs de datasource
apontando para loopback. Nenhuma migration ou escrita foi feita no Neon.

## Evidência visual e acessibilidade

- `admin-desktop-light.png`
- `admin-desktop-dark.png`
- `admin-mobile-dark.png`
- `audit-mobile-dark.png`

Verificados 1440x900 e 390x844, light/dark, navegação por teclado, alternância de
tema, menu móvel, fechamento após navegação e ausência de overflow horizontal.
Após as correções, axe-core 4.12.1 reportou 0 violations e 0 incomplete no shell
fechado em desktop e mobile; console do navegador sem erros.

## Incidentes corrigidos durante o gate

1. chrome público herdado pelo `/admin`;
2. contraste insuficiente em labels da sidebar;
3. painel móvel permanecia aberto após selecionar o destino;
4. landmarks `main` duplicados e conteúdo da sidebar fora de landmark.

## Limites e pendências

- produção e Neon não foram inventariados nem alterados;
- concessão/revogação interativa de assignments críticos permanece para a etapa
  de privilégios com step-up, dupla aprovação e JIT;
- a Etapa 03 pode iniciar localmente.
