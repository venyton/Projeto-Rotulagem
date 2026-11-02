# Riscos e pendências

## RISK-001 — Estado remoto de migrations desconhecido

Etapa: 01
Severidade: HIGH
Status: OPEN

Descrição: o estado remoto não foi inventariado. Houve apenas a consulta
read-only acidental descrita em `RISK-004`, insuficiente para provar lineage ou
ausência de drift.

Impacto: um deploy sem inventário pode falhar ou consolidar estado incorreto.

Mitigação: autorização explícita, inventário read-only, backup validado, dry-run
e revisão antes de qualquer escrita.

Responsável/decisão necessária: usuário e responsável pelo release.

Prazo ou etapa alvo: Etapa 12, antes do rollout.

## RISK-002 — Entitlements ausentes são atualmente default-on

Etapa: 04
Severidade: HIGH
Status: CLOSED

Descrição: fluxos existentes sintetizam entitlements ausentes como habilitados.

Impacto: migração ingênua pode conceder acesso ou quebrar clientes.

Mitigação: compatibilidade explícita, backfill e resolvedor central com testes de
precedência e bypass.

Responsável/decisão necessária: implementação técnica dentro do plano.

Prazo ou etapa alvo: concluído em 26/08/2026.

## RISK-003 — Gate da Etapa 01 falhou no build

Etapa: 01
Severidade: MEDIUM
Status: CLOSED

Descrição: `OrganizationRole.BILLING` não era aceito pelo contrato de autoridade
do workspace.

Impacto: build bloqueado e risco de tratamento acidentalmente privilegiado.

Mitigação: incluir o valor histórico no domínio com queda explícita para menor
privilégio, teste negativo e repetição integral do gate.

Responsável/decisão necessária: implementação técnica dentro da Etapa 01.

Prazo ou etapa alvo: concluído em 25/08/2026.

## RISK-004 — Consulta remota não intencional e somente leitura

Etapa: 01
Severidade: MEDIUM
Status: CLOSED

Descrição: um `prisma migrate status` recebeu overrides com nomes que não eram os
consumidos pelo datasource e carregou a URL remota do `.env`.

Impacto: o Neon foi consultado apesar da fronteira local pretendida. O comando
foi somente leitura, listou status e não aplicou migrations nem alterou dados.

Mitigação: interromper chamadas remotas, usar explicitamente
`POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` e `DATABASE_URL` com loopback, e
confirmar o datasource sanitizado antes dos próximos comandos Prisma.

Responsável/decisão necessária: nenhuma decisão externa; escrita remota segue
bloqueada.

Prazo ou etapa alvo: mitigado imediatamente em 25/08/2026.

## RISK-005 — Falhas de composição e acessibilidade no shell administrativo

Etapa: 02
Severidade: MEDIUM
Status: CLOSED

Descrição: a primeira renderização herdava o chrome público, tinha contraste
insuficiente na sidebar, dois landmarks `main` e mantinha o painel móvel aberto
após navegação.

Impacto: mistura entre produto público e Control Plane, leitura assistiva
ambígua e conteúdo encoberto no mobile.

Mitigação: chrome condicional por pathname, cores semânticas da sidebar, único
landmark principal, landmark de navegação e fechamento do painel no clique.

Responsável/decisão necessária: implementação técnica da Etapa 02.

Prazo ou etapa alvo: concluído e revalidado por axe em 25/08/2026.

## RISK-006 — Contratos comerciais legado e versionado coexistem

Etapa: 03
Severidade: HIGH
Status: CLOSED

Descrição: `Plan` ainda preserva preços embutidos/Stripe e `PlanModule`, enquanto
operações novas usam `PlanVersion`, `PlanVersionFeature` e `BillingPrice`.

Impacto: um consumidor antigo pode ignorar versão/preço novo ou um dual-write
ingênuo pode reescrever histórico.

Mitigação: catálogo novo é autoritativo para operações novas; campos antigos são
somente compatibilidade. Etapa 04 migra leitura de entitlement e Etapa 06 migra o
ciclo de assinatura sem remoção destrutiva.

Responsável/decisão necessária: implementação técnica das Etapas 04 e 06.

Prazo ou etapa alvo: concluído na Etapa 06. O ciclo novo relê somente
`PlanVersion`/`BillingPrice`; os campos legados permanecem compatibilidade sem
autoridade sobre novas contratações.

## RISK-007 — Consumo periódico ainda não tem ledger autoritativo

Etapa: 04
Severidade: HIGH
Status: CLOSED

Descrição: o limite efetivo e o enforcer genérico existem, mas ainda não há
persistência de uso por período, `resetAt` ou deduplicação de eventos de consumo.

Impacto: quotas mensais de AI/API não podem ser ativadas com enforcement real sem
risco de subcontagem, dupla contagem ou reset incorreto.

Mitigação: manter essas quotas fora do enforcement comercial até criar ledger,
período, chave idempotente, agregação por tenant e testes de reset na Etapa 10.

Responsável/decisão necessária: implementação técnica dentro do plano.

Prazo ou etapa alvo: Etapa 10.

Fechamento: a Etapa 10 adicionou `UsageEvent` e `UsageAggregate`, chave
idempotente por tenant, período mensal UTC, advisory lock, enforcement atômico e
testes de concorrência/reset/cross-tenant.

## RISK-008 — Compatibilidade `v1` preserva acesso amplo legado

Etapa: 04
Severidade: MEDIUM
Status: OPEN

Descrição: organizações preexistentes sem fonte explícita continuam autorizadas
pela política identificável `LEGACY_POLICY_V1`.

Impacto: clientes antigos não recebem deny-by-default até serem vinculados a uma
composição versionada ou migrados para a política `v2`.

Mitigação: origem observável, novas organizações em `v2`, subscription/grant/
override com precedência maior e conversão gradual com telemetria e gate humano.

Responsável/decisão necessária: produto e responsável pelo rollout.

Prazo ou etapa alvo: Etapa 12, antes de retirar a política `v1`.

## RISK-009 — Credencial Asaas Sandbox ausente

Etapa: 05
Severidade: HIGH
Status: OPEN

Descrição: `ASAAS_API_KEY` não existe no shell nem nos arquivos locais
inspecionados. O diagnóstico seguro retorna `not_configured`.

Impacto: contratos oficiais de customer, checkout, assinatura e webhooks ainda
não podem ser comprovados contra o Sandbox. Isso impede homologação e qualquer
go/no-go de produção, mas não bloqueia a implementação local por decisão humana
explícita de 26/08/2026.

Mitigação: implementar adapters isolados, fixtures e testes de contrato mockados;
depois disponibilizar chave exclusiva Sandbox por variável de ambiente, executar
a matriz financeira completa e registrar saída sanitizada. Não usar nem fornecer
chave de produção.

Responsável/decisão necessária: responsável pela conta Asaas Sandbox.

Prazo ou etapa alvo: Etapa 12, antes do gate de homologação e rollout.

## RISK-010 — Divergência oficial no campo de customer do Checkout

Etapa: 06
Severidade: HIGH
Status: OPEN

Descrição: o guia oficial do Asaas documenta `customer` para reutilizar um
customer existente, enquanto o OpenAPI vigente de `POST /v3/checkouts` enumera
apenas `customerData`.

Impacto: escolher um shape incompatível pode rejeitar o Checkout ou criar customer
duplicado, prejudicando a reconciliação.

Mitigação: manter o detalhe apenas no adapter, cobrir shapes e validação por teste
local, não habilitar produção e resolver por teste oficial no Sandbox quando a
chave estiver disponível.

Responsável/decisão necessária: implementação local agora; responsável pela conta
Asaas fornece credencial Sandbox no gate final.

Prazo ou etapa alvo: Etapa 12, antes de homologação externa.

## RISK-011 — Token e eventos reais de webhook ausentes

Etapa: 07
Severidade: HIGH
Status: OPEN

Descrição: `ASAAS_WEBHOOK_AUTH_TOKEN` e a chave Sandbox ainda não existem; nenhum
evento real, retry, fila interrompida ou Webhook Log foi observado.

Impacto: payloads e comportamento externo continuam comprovados somente pela
documentação vigente, mocks e banco local.

Mitigação: endpoint permanece fechado com 503 sem token; produção financeira
continua OFF. Na Etapa 12, configurar token Sandbox distinto da API key, executar
replay real, revisar logs e testar reativação/monitoramento da fila.

Responsável/decisão necessária: responsável pela conta Asaas Sandbox.

Prazo ou etapa alvo: Etapa 12, antes de qualquer piloto.

## RISK-012 — Upsert acidental de fixture no Neon

Etapa: 10
Severidade: HIGH
Status: OPEN

Descrição: em 27/08/2026, um comando auxiliar de preparação do browser foi
executado sem sobrescrever as URLs do Prisma. O runtime carregou `.env` e
concluiu somente o upsert de `stage10-browser@example.test` em `User` antes de
falhar ao consultar `PlatformRole`, ausente naquele schema.

Impacto: o banco remoto recebeu uma mutação não autorizada. Não houve migration,
assignment, organização nem agregado de uso remoto. O comando pode ter criado o
usuário ou atualizado nome/senha se o e-mail já existisse.

Mitigação: execução foi interrompida; nenhum novo acesso remoto foi feito.
Comandos Prisma posteriores sobrescrevem `POSTGRES_PRISMA_URL`,
`POSTGRES_URL_NON_POOLING` e `DATABASE_URL` com `127.0.0.1:54329`. Consultar ou
remover o registro remoto exige autorização humana explícita e escopo exato.

Responsável/decisão necessária: responsável pelo banco decide entre inspeção e
remoção cirúrgica ou preservação do registro.

Prazo ou etapa alvo: antes do encerramento da Etapa 12.
