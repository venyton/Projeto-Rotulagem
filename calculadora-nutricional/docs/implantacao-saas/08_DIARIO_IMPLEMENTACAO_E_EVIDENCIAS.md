# SoIZI Control Plane — Diário de Implementação e Evidências

**Este arquivo deve ser atualizado continuamente pelo Codex durante o desenvolvimento.**

Não registrar cadeia de pensamento privada. Registrar decisões, fatos, fontes, evidências, resultados e justificativas técnicas verificáveis.

---

## Regras

1. Uma entrada por etapa/subetapa relevante.
2. Atualizar antes e depois da mudança.
3. Toda integração externa exige seção “Documentação oficial consultada”.
4. Toda migration exige seção “Estado do banco antes/depois”.
5. Toda decisão de segurança exige threat/risk note.
6. Nunca colar secrets, tokens, dados de cartão ou payload sensível.
7. Comandos podem ser registrados, mas redactar credenciais.
8. Falhas devem permanecer no diário mesmo depois de corrigidas.

---

# TEMPLATE DE ENTRADA

## [DATA/HORA] Etapa X.Y — Título

### Contexto

- Branch:
- Commit-base:
- Ambiente:
- Responsável/agente:
- Documento de plano relacionado:

### Objetivo

Descrever objetivamente o que esta subetapa pretende entregar.

### Estado encontrado antes da alteração

- código existente:
- schema/migrations:
- comportamento:
- riscos identificados:

### Documentação oficial consultada

| Fonte oficial | URL | Data consultada | Requisito aplicado |
| --- | --- | --- | --- |
| | | | |

### Decisão arquitetural

- decisão:
- alternativas consideradas:
- motivo verificável da escolha:
- impacto de compatibilidade:

### Alterações realizadas

#### Arquivos criados

-

#### Arquivos alterados

-

#### Migrations

-

#### Variáveis de ambiente

- adicionar apenas nomes, nunca valores.

### Regras de segurança aplicadas

-

### Testes adicionados

-

### Testes/comandos executados

```text
npm ...
```

### Resultado

- lint:
- typecheck:
- unit:
- integration:
- security-check:
- build:
- sandbox contract test:

### Evidências

- IDs de teste não sensíveis:
- screenshots/logs sanitizados:
- relatório gerado:

### Falhas encontradas

-

### Correções aplicadas

-

### Riscos remanescentes

-

### Pendências

-

### Decisão humana necessária?

- [ ] Não
- [ ] Sim — descrever:

### Gate da etapa

- [ ] VERDE — pode prosseguir
- [ ] AMARELO — prosseguir somente com ressalva registrada
- [ ] VERMELHO — não prosseguir

### Próxima ação

-

---

# CHECKPOINTS MÍNIMOS DO PROJETO

## Etapa 0 — Baseline

- [x] arquitetura atual lida
- [x] schema inventariado
- [x] migrations históricas inventariadas
- [x] billing legado localizado
- [x] fontes oficiais registradas

## Etapa 1 — Banco

- [x] ADR de reconciliação
- [x] migration strategy
- [x] upgrade test
- [x] backup/runbook local e procedimento remoto documentados

## Etapa 2 — Admin IAM

- [ ] platform permissions
- [ ] platform roles
- [ ] `/admin` guard
- [ ] break-glass preservado
- [ ] audit

## Etapa 3 — Catálogo

- [ ] plan
- [ ] plan version
- [ ] feature
- [ ] price
- [ ] publish immutability

## Etapa 4 — Entitlements

- [ ] resolver
- [ ] limits
- [ ] precedence
- [ ] cross-tenant

## Etapa 5 — Asaas Sandbox

- [ ] official docs current
- [ ] adapter
- [ ] customer
- [ ] checkout
- [ ] no card data

## Etapa 6/7 — Billing lifecycle

- [ ] subscription
- [ ] charges
- [ ] webhooks
- [ ] idempotency
- [ ] reconciliation

## Etapa 8/9 — Admin commercial

- [ ] organizations
- [ ] coupons
- [ ] grants
- [ ] step-up

## Etapa 10+ — Metrics/hardening

- [ ] usage
- [ ] dashboards
- [ ] privileged session
- [ ] E2E
- [ ] rollout

---

## 25/08/2026 11:12 -03:00 — Etapa 0 — Baseline, inventário e fontes oficiais

### Contexto

- Branch: `feat/padronizacao-interface-e-governanca`
- Commit-base: `de730f82bae1b0c225f5863b8d7c663a8e09abdd`
- Ambiente: checkout `Projeto-Rotulagem-security-regras-negocio`; PostgreSQL local em `127.0.0.1:54329`; nenhuma operação no Neon
- Responsável/agente: Codex
- Documento de plano relacionado: `00_LEIA_PRIMEIRO_ORDEM_DE_EXECUCAO.md`, Etapa 0, e `01_PLANO_MESTRE_CONTROL_PLANE_SOIZI.md`, seção 29

### Objetivo

Ler o pacote normativo na ordem canônica, confrontá-lo com o runtime e a evolução histórica reais, registrar fontes oficiais vigentes e estabelecer um gate verificável antes de qualquer migration ou implementação do Control Plane.

### Estado encontrado antes da alteração

- Código existente: Next.js 16.2.12, React 19.2.3, NextAuth 4.24.15, Prisma 5.22.0 e TypeScript 5.9.3. Foram inventariados 13 domínios em `src/features`, 13 Route Handlers, 9 módulos de Server Actions e 18 arquivos de teste.
- Schema/migrations: 26 models, 11 enums e 20 diretórios versionados de migration. A história começa por alterações incrementais e não contém uma migration inicial capaz de criar isoladamente todas as tabelas-base.
- Billing legado: a migration `20260515120000_add_saas_billing_modules_marketing` criou catálogo, billing, webhook e marketing com `PaymentProvider` limitado a `STRIPE` e `MANUAL`; esses models não existem mais no `schema.prisma` atual e não há migration versionada que remova ou reconcilie todos esses objetos.
- Comportamento: não existem rotas `/admin`, IAM interno de plataforma, sessão privilegiada, adapter Asaas/Cora nem catálogo de features do novo plano. Operações globais dependentes de allowlist de e-mail estão expostas no fluxo de configurações do dashboard do cliente.
- Entitlements: caminhos de criação/login/configuração sintetizam ou criam módulos ausentes como habilitados. Isso conflita com `deny by default` e com a futura resolução efetiva por plano, grant e override.
- Auditoria: `SecurityAuditLog` não oferece ainda o contrato completo de ator/papel, resultado, motivo, correlação, estado anterior/posterior e sessão privilegiada.
- CI/testes: existem gates estáticos, unitários, de segurança e build, mas não há suíte de integração com PostgreSQL nem E2E do Control Plane.
- Worktree: já havia alterações não relacionadas (`calculadora-nutricional/AGENTS.md` removido, `AGENTS.md` novo e o pacote `docs/implantacao-saas/` não rastreado); foram preservadas.
- Banco local antes do reset: o container compartilhado com outro checkout continha 59 tabelas, 28 enums e 33 migrations, das quais 13 não existem nesta branch. Esse estado não era evidência válida da arquitetura deste checkout.

### Documentação oficial consultada

| Fonte oficial | URL | Data consultada | Requisito aplicado |
| --- | --- | --- | --- |
| Next.js — Authentication | https://nextjs.org/docs/app/guides/authentication | 25/08/2026 | Autorizar no servidor e tratar Actions/Route Handlers como superfícies públicas |
| Next.js — Proxy | https://nextjs.org/docs/app/getting-started/proxy | 25/08/2026 | Proxy faz apenas checks otimistas; autorização autoritativa permanece próxima dos dados |
| Prisma — Baseline existing database | https://www.prisma.io/docs/orm/prisma-migrate/getting-started | 25/08/2026 | Banco existente exige baseline/história versionada antes de release confiável |
| Prisma — `migrate deploy` | https://www.prisma.io/docs/cli/migrate/deploy | 25/08/2026 | Produção aplica migrations pendentes; o comando não detecta drift nem faz reset |
| Prisma — Best practices | https://www.prisma.io/docs/orm/more/best-practices | 25/08/2026 | `db push` fica restrito a prototipação/bootstrap local, nunca ao release remoto |
| OWASP — Authorization | https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html | 25/08/2026 | Menor privilégio, deny-by-default e autorização em toda requisição |
| OWASP — Logging | https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html | 25/08/2026 | Audit trail atribuível e reconstruível, separado conforme finalidade |
| AWS — SaaS isolation mindset | https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/isolation-mindset.html | 25/08/2026 | Isolamento tenant é obrigatório e deve ser imposto por mecanismo compartilhado |
| AWS — SaaS general design principles | https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/general-design-principles.html | 25/08/2026 | Contexto tenant de primeira classe, isolamento em todas as camadas e operação unificada |
| NIST — SP 800-218 SSDF 1.1 | https://csrc.nist.gov/pubs/sp/800/218/final | 25/08/2026 | Integrar práticas de desenvolvimento seguro ao ciclo e aos gates |
| Asaas — Authentication | https://docs.asaas.com/docs/autentica%C3%A7%C3%A3o-1 | 25/08/2026 | Chaves e endpoints distintos por ambiente; token somente no backend |
| Asaas — Recurring checkout | https://docs.asaas.com/docs/checkout-com-assinatura-recorrente | 25/08/2026 | Checkout hospedado recorrente é a referência vigente para o MVP com cartão |
| Asaas — PCI DSS | https://docs.asaas.com/docs/pci-dss-1 | 25/08/2026 | Evitar que dados de cartão atravessem o backend SoIZI |
| Asaas — Webhook idempotency | https://docs.asaas.com/docs/como-implementar-idempotencia-em-webhooks | 25/08/2026 | Entrega at-least-once, inbox persistente com ID único e processamento assíncrono |
| Asaas — Webhook FAQ | https://docs.asaas.com/docs/faq-de-webhooks | 25/08/2026 | Responder especificamente HTTP 200 após persistência; outros status provocam reentrega |
| Cora — Direct integration | https://developers.cora.com.br/docs/utiliza%C3%A7%C3%A3o-das-apis | 25/08/2026 | Integração futura exige mTLS, credenciais e URL corretas por ambiente |
| Cora — OAuth2 client credentials | https://developers.cora.com.br/docs/client-credentials-int-direta | 25/08/2026 | Certificado, chave privada e client ID permanecem server-only |

### Decisão arquitetural

- Decisão: encerrar a Etapa 0 sem criar migration nem implementar billing/admin e liberar somente a Etapa 1, dedicada a reconciliar schema, história e bancos representativos.
- Alternativas consideradas: iniciar diretamente os novos models; tratar o banco compartilhado como baseline; limpar objetos históricos automaticamente.
- Motivo verificável da escolha: a história versionada não reproduz todas as tabelas-base e diverge tanto do schema atual quanto do banco local anteriormente compartilhado. Uma migration funcional agora poderia consolidar drift ou remover dados sem uma linhagem conhecida.
- Impacto de compatibilidade: nenhum contrato de runtime foi alterado; a próxima etapa deve ser aditiva e preservar os objetos e dados históricos até ADR e teste de upgrade aprovados.

### Alterações realizadas

#### Arquivos criados

- `docs/implantacao-saas/10_RELATORIO_BASELINE_ETAPA_0.md`

#### Arquivos alterados

- `docs/implantacao-saas/08_DIARIO_IMPLEMENTACAO_E_EVIDENCIAS.md`

#### Migrations

- Nenhuma migration criada ou alterada.
- O PostgreSQL local foi recriado após autorização explícita do usuário. O script local materializou o schema atual em banco vazio e marcou as 20 migrations deste checkout como aplicadas.

#### Variáveis de ambiente

- Nenhuma variável criada ou modificada.
- Os comandos de validação usam overrides explícitos para os nomes `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` e `DATABASE_URL`, todos apontando ao PostgreSQL local; valores não são registrados.

### Regras de segurança aplicadas

- Nenhuma credencial, token ou payload sensível foi lido no relatório.
- O host e o banco das URLs efetivas foram verificados de forma sanitizada antes de qualquer operação destrutiva.
- O reset foi limitado ao banco local exato `calculadora_nutricional`; o Neon não foi acessado nem alterado.
- Nenhum `db push`, migration, deploy ou escrita foi executado em banco remoto.
- Conclusões de outros worktrees não foram transferidas para este checkout.

### Testes adicionados

- Nenhum; Etapa 0 documental e diagnóstica.

### Testes/comandos executados

```text
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short --branch
docker compose -f docker-compose.local.yml exec postgres psql ...
npm run db:local:migrate
npx prisma migrate status --schema=./prisma/schema.prisma
npm run check
npm run security:check
npm run build
git diff --check
```

### Resultado

- lint: aprovado
- typecheck: aprovado
- unit: 56/56 aprovados
- integration: inexistente para PostgreSQL/Control Plane nesta etapa
- security-check: aprovado; checks de fonte passaram e `npm audit` encontrou 0 vulnerabilidades no nível configurado
- build: aprovado; Next.js compilou, validou TypeScript e gerou 30 páginas sem rota `/admin`
- sandbox contract test: não aplicável; Asaas/Cora não foram integrados

### Evidências

- Banco local depois do reset: 27 tabelas públicas, 11 enums públicos, 20 migrations finalizadas e nenhuma migration incompleta.
- Dados de domínio estimados depois do reset: zero.
- Relatório gerado: `docs/implantacao-saas/10_RELATORIO_BASELINE_ETAPA_0.md`.

### Falhas encontradas

- A primeira tentativa de reset referenciou o arquivo Compose a partir do diretório errado; o `DROP DATABASE` não ocorreu. Em seguida, `npm run db:local:migrate` aplicou apenas a migration local pendente `20260824130000`. O erro foi identificado antes de declarar o reset concluído.
- O script `db:local:migrate` usa `prisma db push` em banco local vazio e depois `migrate resolve --applied`; esse procedimento mascara a ausência de migration inicial e não constitui teste de replay histórico.
- A documentação interna de webhook prescreve resposta `2xx`, enquanto o FAQ oficial vigente do Asaas considera especificamente HTTP 200 como sucesso.
- URLs internas antigas de checkout recorrente e PCI DSS redirecionam ou foram substituídas por slugs oficiais localizados.

### Correções aplicadas

- O reset foi repetido com o caminho Compose correto, conexão administrativa ao banco `postgres`, encerramento das conexões apenas do alvo local, drop e criação do banco local exato.
- O banco foi revalidado após o bootstrap; não restaram migrations externas ao checkout.
- O conflito HTTP 200 versus `2xx` foi registrado como requisito para correção normativa antes da implementação do webhook.

### Riscos remanescentes

- **Alto:** linhagem de migrations incompleta e divergente do schema; release remoto permanece bloqueado até ADR, baseline/reconciliação e teste de upgrade representativo.
- **Alto:** entitlements ausentes são habilitados por padrão em caminhos críticos; migrar para catálogo/planos sem estratégia pode conceder acesso indevido ou quebrar clientes existentes.
- **Alto:** operações globais e identidade master estão misturadas ao Customer Admin Plane; não há ainda separação `/admin`, IAM interno ou step-up.
- **Médio:** modelo atual de auditoria é insuficiente para ações privilegiadas e billing.
- **Médio:** o guard estático de Route Handlers exige proteção same-origin para todo POST mutável; webhooks externos precisarão de exceção estreita, autenticada e testada, sem enfraquecer as demais rotas.
- **Médio:** falta cobertura de integração com banco, E2E de autorização e teste de replay/upgrade das migrations.
- **Médio:** `.env.example` mantém placeholders legados de Stripe/marketing, não define o bundle Asaas e não contém `DOCUMENT_HASH_SECRET`; a limpeza/configuração exige etapa própria e sem segredos reais.

### Pendências

- Criar ADR de reconciliação e classificar objetos históricos em preservar/adaptar/depreciar/remover depois.
- Construir fixture de banco representativo e provar replay/upgrade sem perda.
- Definir a precedência de entitlement efetivo e a transição compatível do default-on atual para deny-by-default.
- Atualizar os trechos normativos do webhook para HTTP 200 e os links oficiais antes da Etapa 5.
- Só depois do gate da Etapa 1 iniciar models de IAM/Control Plane.

### Decisão humana necessária?

- [x] Não para concluir a Etapa 0 e iniciar exclusivamente a análise/ADR da Etapa 1.
- [ ] Sim

### Gate da etapa

- [x] VERDE — pode prosseguir somente para a Etapa 1 de reconciliação; migrations funcionais, billing e `/admin` continuam bloqueados.
- [ ] AMARELO — prosseguir somente com ressalva registrada
- [ ] VERMELHO — não prosseguir

### Próxima ação

Produzir o ADR de reconciliação do banco, o inventário objeto-a-objeto e o desenho do teste de upgrade representativo, sem escrever em banco remoto.

---

## 25/08/2026 11:34 -03:00 — Etapa 1 — Início da reconciliação segura do histórico

### Contexto

- Branch: `feat/padronizacao-interface-e-governanca`
- Commit-base: `de730f82bae1b0c225f5863b8d7c663a8e09abdd`
- Ambiente: checkout atual e PostgreSQL local em `127.0.0.1:54329`; Neon fora do escopo
- Responsável/agente: Codex
- Documento de plano relacionado: `01_PLANO_MESTRE_CONTROL_PLANE_SOIZI.md`, seção 29, Etapa 1; `02_ARQUITETURA_DOMINIOS_E_MODELO_DADOS.md`, seção 8; `07_TESTES_MIGRACOES_HOMOLOGACAO_ROLLOUT.md`, seções 3–5

### Objetivo

Tornar a história versionada reproduzível desde um PostgreSQL vazio, preservar a cadeia de 20 migrations já existente, classificar os 14 artefatos de prototype billing/admin encontrados em outro worktree e provar, em bancos locais descartáveis, instalação limpa e upgrade de dados históricos sem perda.

### Estado encontrado antes da alteração

- A primeira migration versionada pressupõe cinco tabelas preexistentes (`User`, `Ingredient`, `CustomIngredient`, `GeneratedTable` e `TableItem`).
- O commit pai `eea542a60f516ec06dbbf78b1f29d7ba4fd23496` contém o schema verificável imediatamente anterior à adoção da pasta de migrations.
- Um teste direto que aplicou esse schema histórico e tentou `prisma migrate deploy` falhou corretamente com `P3005`, pois o banco não vazio ainda não possuía baseline registrado.
- O worktree histórico `/home/paz/projetos/Projeto-Rotulagem` contém 14 migrations não rastreadas, entre `20260722150000` e `20260723100000`, e 29 models adicionais de IAM, billing, configuração e consumo. Elas nunca aparecem em `git log --all` e, portanto, não constituem história oficial deste checkout.
- Essas migrations prototype ainda usam Stripe como único `BillingProvider`, contrariando a arquitetura Asaas atual; não serão copiadas cegamente nem aplicadas ao banco corrente.

### Documentação oficial consultada

| Fonte oficial | URL | Data consultada | Requisito aplicado |
| --- | --- | --- | --- |
| Prisma — Baselining a database | https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining | 25/08/2026 | Criar migration baseline anterior às demais e marcá-la aplicada em bancos preexistentes |
| Prisma — `migrate diff` | https://docs.prisma.io/docs/cli/migrate/diff | 25/08/2026 | Gerar SQL reproduzível de empty para o schema histórico verificável |
| Prisma — CLI reference | https://docs.prisma.io/docs/orm/reference/prisma-cli-reference | 25/08/2026 | Tratar divergência entre diretório e `_prisma_migrations` como falha de status |
| Prisma — `migrate deploy` | https://docs.prisma.io/docs/cli/migrate/deploy | 25/08/2026 | Aplicar somente migrations pendentes; drift precisa de verificação separada |

### Decisão arquitetural inicial

- Preservar todos os 20 diretórios ativos sem alterar seus checksums.
- Criar `0_baseline_pre_prisma_migrate` a partir do schema histórico do commit pai da primeira migration.
- Em bancos preexistentes, exigir `prisma migrate resolve --applied 0_baseline_pre_prisma_migrate` antes do próximo deploy; nunca executar o SQL baseline sobre tabelas já existentes.
- Em bancos novos, permitir que `migrate deploy` aplique baseline e toda a cadeia normalmente.
- Classificar as 14 migrations não rastreadas como **prototype lineage**, não como autoridade. Qualquer ambiente que as registre deve bloquear release e passar por reconciliação humana com backup antes de escrita.

### Gate inicial da Etapa 1

- [x] Etapa 0 aprovada
- [x] fonte histórica pré-migrations localizada
- [x] documentação oficial Prisma consultada
- [ ] baseline versionado
- [ ] instalação limpa provada
- [ ] upgrade com dados históricos provado
- [ ] ADR e runbook concluídos
- [ ] gate final da Etapa 1

### Alterações realizadas

#### Arquivos criados

- `prisma/migrations/0_baseline_pre_prisma_migrate/migration.sql`
- `prisma/migrations/20260825114500_reconcile_historical_schema/migration.sql`
- `scripts/test-migration-upgrade.mjs`
- `docs/implantacao-saas/adrs/ADR-001-RECONCILIACAO-HISTORICO-PRISMA.md`
- `docs/implantacao-saas/11_RELATORIO_RECONCILIACAO_BANCO_ETAPA_1.md`

#### Arquivos alterados

- `prisma/schema.prisma`
- `scripts/local-db.mjs`
- `package.json`
- `docs/implantacao-saas/08_DIARIO_IMPLEMENTACAO_E_EVIDENCIAS.md`

#### Migrations

- `0_baseline_pre_prisma_migrate`: cria somente as cinco tabelas-base anteriores ao Prisma Migrate.
- `20260825114500_reconcile_historical_schema`: completa colunas sem migration, preserva enums e restaura sete tabelas históricas de billing/marketing quando ausentes.
- Nenhuma migration histórica anterior foi editada, removida ou renomeada.
- Nenhuma migration foi aplicada no Neon.

### Decisão arquitetural final

- O histórico oficial passa a ter 22 migrations reproduzíveis.
- Os sete models de 15/05/2026 permanecem modelados para impedir drift e perda: `Plan`, `PlanModule`, `BillingCustomer`, `Subscription`, `BillingWebhookEvent`, `MarketingKeyword` e `MarketingEvent`.
- `Plan`, `BillingCustomer` e `Subscription` serão evoluídos de forma aditiva nas etapas comerciais; os objetos de marketing ficam preservados sem novos writes.
- Os 14 diretórios não rastreados do worktree histórico são prototype lineage. Não serão copiados; um ambiente remoto que os registre bloqueia release até reconciliação específica.
- `db push` continua disponível apenas por compatibilidade de comando, agora encapsulado pelo guard local que recusa qualquer datasource fora de `127.0.0.1:54329`.

### Testes/comandos executados

```text
npx prisma validate --schema=./prisma/schema.prisma
npm run test:migrations
npm run db:local:migrate
npx prisma migrate diff --from-url <postgresql-local-descartavel> --to-schema-datamodel ./prisma/schema.prisma --exit-code
```

### Resultado da Etapa 1

- instalação limpa: 22 migrations, 34 tabelas públicas, 15 enums e 0 FK inválida;
- diff banco/schema: nenhuma diferença;
- upgrade representativo: usuário, tabela, item, ingrediente customizado, membership, entitlement, plano, billing customer, subscription, webhook e marketing preservados;
- tenant backfill: zero recurso sintético sem `organizationId`;
- bancos de teste: descartados automaticamente;
- banco local corrente: recriado pelas 22 migrations, sem `db push`;
- banco remoto: não acessado.

### Segurança

- A migration é aditiva e não ativa nenhum fluxo financeiro.
- Valores de enum legados são preservados, mas não entram no catálogo operacional nem concedem acesso automaticamente.
- O script de teste só cria e remove bancos com prefixo `soizi_migration_test_` no PostgreSQL local fixo.
- O script local interrompe banco inconsistente sem reset automático.
- Nenhum secret ou dado real foi incluído nas fixtures.

### Riscos remanescentes

- O estado real de migrations/tabelas no Neon permanece desconhecido por decisão de escopo; produção continua bloqueada.
- Se a lineage prototype aparecer em ambiente real, será necessário backup e plano específico, sem apagar `_prisma_migrations`.
- Models legados ficam disponíveis no Prisma Client até sua evolução/depreciação nas etapas seguintes.

### Gate final da Etapa 1

- [x] baseline versionada
- [x] instalação limpa provada
- [x] upgrade com dados históricos provado
- [x] ADR e runbook concluídos
- [x] VERDE — avançar para a Etapa 2 em ambiente local
- [x] AMARELO remoto — nenhuma escrita no Neon até autorização, inventário e backup

### Próxima ação

Iniciar a Etapa 2 com models de IAM de plataforma, guard server-side e shell `/admin`; antes do trabalho visual, carregar a skill shadcn e ler integralmente `ui-autoexplicativa.md`.
