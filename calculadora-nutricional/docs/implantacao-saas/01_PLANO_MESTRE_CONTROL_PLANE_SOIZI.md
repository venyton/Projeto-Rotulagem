# Plano Mestre Oficial — SoIZI Control Plane, Billing e Administração SaaS

**Versão:** 1.0  
**Data-base:** 25/08/2026  
**Status:** arquitetura-alvo e plano oficial de implementação  
**Aplicação:** SoIZI  
**Documento canônico para esta iniciativa:** sim

---

## 1. Objetivo

Evoluir a SoIZI de uma aplicação SaaS multi-organização com módulos e autorizações já implementados para uma plataforma comercial e operacional completa, com:

- Control Plane interno separado do produto do cliente;
- catálogo versionado de planos, preços, módulos e features;
- entitlements e limites por organização;
- billing recorrente via Asaas;
- Cora como conta bancária de tesouraria/destino;
- administração global de organizações e usuários;
- descontos, cupons e concessões comerciais;
- segurança privilegiada para operadores internos;
- auditoria forte;
- métricas SaaS e consumo por tenant;
- fluxo de onboarding/offboarding repetível;
- testes, homologação e rollout seguro.

O objetivo **não** é substituir a arquitetura atual da SoIZI. O objetivo é construir uma camada de gestão SaaS sobre a base existente, preservando o modelo atual de organizações, memberships, perfis, módulos, tenant-scoping, recálculo autoritativo e segurança server-side.

---

## 2. Estado atual que deve ser preservado

A documentação canônica da SoIZI de 25/08/2026 descreve uma aplicação:

- multiusuário e multi-organização;
- monólito modular Next.js;
- Prisma + PostgreSQL;
- NextAuth/JWT;
- organizações e memberships;
- perfis e grants;
- `OrganizationEntitlement` e `SaaSModuleKey`;
- 2FA TOTP;
- audit log;
- isolamento tenant-scoped na camada da aplicação;
- API tokens armazenados por hash;
- recálculo server-side de dados sensíveis;
- CI com guardrails arquiteturais e de segurança;
- billing/marketing apenas como vestígio histórico de migrations, sem runtime atual.

### 2.1 Invariantes que não podem ser quebradas

1. O tenant é a **Organization**, nunca o usuário.
2. `userId` representa identidade/autoria; `organizationId` define isolamento de dados de cliente.
3. IDs vindos do cliente não escolhem o tenant.
4. O navegador não é autoridade para dados oficiais ou permissões.
5. Toda operação sensível revalida identidade, contexto, autorização e entrada no servidor.
6. O Control Plane não deve enfraquecer o tenant isolation do Application Plane.
7. Billing histórico não deve ser reativado “por acidente” através de migrations antigas.
8. Produção usa migrations revisadas (`prisma migrate deploy`), nunca `db push` como mecanismo de release.

---

## 3. Regra obrigatória de documentação oficial

### 3.1 Política

**Qualquer implementação que dependa de tecnologia externa deve ser baseada na documentação oficial vigente antes do código ser escrito.**

Aplica-se, sem exceção, a:

- Asaas;
- Cora;
- Next.js;
- React;
- Prisma/PostgreSQL;
- NextAuth/Auth.js;
- Vercel;
- OAuth/OIDC;
- TOTP/2FA;
- webhooks;
- APIs financeiras;
- APIs de terceiros;
- mecanismos de criptografia;
- headers/CSP;
- padrões de segurança;
- bibliotecas utilizadas;
- infraestrutura/deploy;
- protocolos de pagamento;
- qualquer nova integração futura.

### 3.2 Obrigação do Codex

Antes de implementar cada etapa dependente de fornecedor, o Codex deve registrar no diário:

- URL oficial;
- página/referência consultada;
- data da consulta;
- ambiente/versão quando aplicável;
- requisitos relevantes extraídos;
- diferenças encontradas em relação ao código atual;
- decisão adotada.

### 3.3 Hierarquia de fontes

Ordem de preferência:

1. documentação oficial da API/produto;
2. referência oficial da versão utilizada;
3. especificação oficial do protocolo/padrão;
4. documentação oficial do framework;
5. repositório oficial do projeto, quando a documentação for insuficiente;
6. somente na ausência real das fontes acima, fontes secundárias podem ser usadas como apoio, nunca como fonte única.

### 3.4 Regra para divergência entre páginas oficiais

Se duas páginas oficiais parecerem divergir:

1. não escolher silenciosamente uma delas;
2. registrar a divergência;
3. priorizar a referência de API mais recente e específica;
4. verificar changelog/FAQ/guia atualizado;
5. validar em Sandbox;
6. adicionar teste de contrato;
7. manter a feature desabilitada em produção até homologação.

Isso é particularmente relevante para modalidades Pix recorrentes/assinaturas, que podem evoluir rapidamente.

---

## 4. Arquitetura macro-alvo

A SoIZI passa a ser tratada em quatro planos funcionais:

### 4.1 Application Plane

Produto utilizado pelo cliente:

- tabelas nutricionais;
- ingredientes;
- fichas técnicas/IA;
- FOP/lupa;
- Enterprise;
- API externa;
- exportações;
- demais módulos do produto.

### 4.2 Customer Administration

Administração que o próprio cliente pode realizar na sua organização:

- membros;
- perfis;
- grants;
- segurança da organização;
- tokens API;
- informações de assinatura permitidas;
- invoices/cobranças permitidas;
- preferências da organização.

### 4.3 Commercial Control Plane

Gestão comercial interna da SoIZI:

- catálogo de planos;
- versões de planos;
- preços;
- módulos/features;
- entitlements;
- assinaturas;
- billing;
- cupons;
- descontos;
- trials;
- cortesias;
- add-ons;
- limites;
- uso medido.

### 4.4 Platform Control Plane

Gestão operacional e de segurança da plataforma:

- organizações;
- usuários globais;
- operadores internos;
- IAM privilegiado;
- auditoria;
- segurança;
- suporte controlado;
- integrações;
- saúde do sistema;
- métricas SaaS;
- incidentes;
- reconciliação financeira.

---

## 5. Separação de rotas e autoridade

### 5.1 Rotas do cliente

Continuam em:

```text
/dashboard/...
```

### 5.2 Rotas do Control Plane

Criar raiz separada:

```text
/admin/...
```

O `/admin` deve possuir:

- layout próprio;
- navegação própria;
- guard próprio;
- contexto de autorização interno próprio;
- permissões internas próprias;
- telemetria/auditoria privilegiada;
- proteção de sessão privilegiada.

Nunca renderizar o Control Plane como “mais uma aba” no dashboard do cliente.

### 5.3 Seleção após login

Quando um usuário tiver tanto acesso normal quanto acesso interno:

```text
Onde deseja entrar?

[ SoIZI ]
[ Administração da plataforma ]
```

Essa escolha muda o plano de operação, não apenas o layout.

---

## 6. Modelo conceitual obrigatório

### 6.1 Não confundir estes conceitos

```text
Plano comercial
    !=
Preço
    !=
Feature
    !=
Módulo
    !=
Entitlement
    !=
Permissão
    !=
Role/Profile
    !=
Usuário
```

### 6.2 Definições

**Módulo**  
Área funcional ampla e relativamente estável do produto. Ex.: TABLES, INGREDIENTS, ENTERPRISE, API_ACCESS.

**Feature**  
Capacidade comercial granular. Ex.: `ai_technical_sheet_import`, `api_tokens`, `international_market_us`, `custom_profiles`, `monthly_ai_import_limit`.

**Plano**  
Produto comercial nomeado, como Starter/Standard/Pro.

**Plan Version**  
Snapshot imutável da composição comercial de um plano em determinado momento.

**Price**  
Preço associado a uma versão/intervalo/moeda. Preço não deve ser inferido pelo nome do plano.

**Entitlement**  
Direito efetivo da organização de usar uma feature ou consumir determinado limite.

**Permission**  
Ação que um membro pode executar.

**Role/Profile**  
Conjunto de permissions atribuível a um membro.

### 6.3 Regra principal

O código de negócio não deve perguntar:

```ts
if (plan === "PRO")
```

Deve perguntar algo equivalente a:

```ts
await requireEntitlement(context, "technical_sheet_ai")
```

ou:

```ts
const limit = await getEntitlementLimit(context, "ai_imports_monthly")
```

---

## 7. Catálogo comercial

### 7.1 Requisitos

O catálogo deve permitir:

- criar plano em draft;
- criar uma versão do plano;
- associar features e limites;
- associar preços mensal/anual;
- publicar versão;
- arquivar plano/preço;
- preservar clientes antigos em versões antigas;
- migrar clientes para nova versão de forma explícita;
- não reescrever histórico comercial.

### 7.2 Imutabilidade comercial

Depois que uma versão publicada tiver assinaturas vinculadas:

- composição histórica não deve ser alterada destrutivamente;
- mudança material gera nova `PlanVersion`;
- mudança de preço gera novo `Price`;
- migrations comerciais devem preservar o contrato anterior.

---

## 8. Entitlements

### 8.1 Fontes possíveis

Um entitlement efetivo pode vir de:

- plano ativo;
- add-on;
- trial;
- concessão manual;
- migração/legado;
- promoção temporária.

### 8.2 Precedência recomendada

1. bloqueio de segurança/compliance;
2. suspensão da organização;
3. override administrativo explícito;
4. concessão temporária válida;
5. add-on ativo;
6. plano/versão da assinatura;
7. default sem acesso.

Toda precedência deve ser testada.

### 8.3 Tipos

Suportar no domínio:

- boolean entitlement;
- quota numérica;
- limite de seats;
- uso medido;
- entitlement com validade;
- entitlement por mercado/capacidade.

### 8.4 Materialização

Preferir um serviço central de resolução de entitlements. Não espalhar regras pelo frontend.

O frontend pode receber uma visão derivada para UX, mas o servidor revalida a cada operação sensível.

---

## 9. Billing — decisão oficial de provider

### 9.1 Provider inicial: Asaas

A SoIZI utilizará o **Asaas como PSP/billing provider inicial** porque a documentação oficial oferece:

- clientes;
- cobranças;
- assinaturas recorrentes;
- cartão;
- boleto;
- Pix e Pix Automático em fluxos documentados;
- Checkout hospedado;
- webhooks;
- Sandbox;
- transferências para conta externa/Pix;
- PCI-DSS no ambiente do provedor.

### 9.2 Conta de tesouraria: Cora

A Cora continuará sendo a conta bancária de destino/tesouraria da SoIZI.

**MVP:** movimentação Asaas → Cora fora da aplicação, de forma operacional/manual.

Motivos:

- reduz superfície de ataque;
- evita que o Control Plane já nasça com permissão de movimentar saldo;
- separa cobrança de tesouraria;
- simplifica auditoria inicial;
- evita dependência de dois motores financeiros simultaneamente.

### 9.3 Automação futura

Automação de transferência para Cora só será implementada em fase posterior e deverá exigir:

- documentação oficial atual do Asaas/Cora;
- conta de destino allowlisted;
- limites por transação/dia;
- step-up MFA;
- dupla aprovação para valores relevantes;
- idempotência;
- reconciliação;
- audit log;
- kill switch;
- Sandbox/homologação;
- decisão humana explícita antes de produção.

---

## 10. Abstração de billing

A aplicação não deve acoplar o domínio comercial diretamente a objetos Asaas.

Criar uma fronteira server-only semelhante a:

```text
BillingProvider
├── ensureCustomer()
├── createCheckout()
├── getCheckout()
├── getSubscription()
├── cancelSubscription()
├── listSubscriptionCharges()
├── getCharge()
├── refundCharge()          # somente quando implementado/homologado
└── reconcileCustomer()
```

E um adapter:

```text
AsaasBillingProvider
```

DTOs internos devem ser provider-neutral. IDs externos ficam em campos `provider*Id`.

### 10.1 Regra de segredo

- API key somente server-side;
- nunca `NEXT_PUBLIC_`;
- nunca no browser;
- nunca em logs;
- nunca em audit payload;
- separar Sandbox e produção;
- rotação documentada.

---

## 11. Cartão e PCI

### 11.1 Decisão de MVP

**Preferir Checkout hospedado Asaas para cartão recorrente.**

A SoIZI não deve construir formulário próprio que envie PAN/CVV ao backend enquanto existir um fluxo oficial hospedado capaz de atender o caso de uso.

### 11.2 Proibições

A SoIZI não deve armazenar:

- PAN completo;
- CVV;
- trilha magnética;
- PIN;
- payload bruto contendo dados sensíveis de cartão.

### 11.3 Mudança de estratégia

Qualquer decisão futura de checkout próprio exige revisão PCI específica e nova aprovação arquitetural.

---

## 12. Checkout e ciclo de assinatura

### 12.1 Fluxo inicial

```text
Usuário autorizado escolhe plano
        ↓
Servidor valida organização e oferta
        ↓
Servidor cria BillingAttempt interno
        ↓
Adapter cria Checkout Asaas
        ↓
SoIZI salva providerCheckoutId/externalReference
        ↓
Usuário é redirecionado ao Asaas
        ↓
Asaas processa pagamento/assinatura
        ↓
Webhook chega à SoIZI
        ↓
Evento é autenticado + persistido + deduplicado
        ↓
Processador reconcilia estado
        ↓
Subscription interna é atualizada
        ↓
Entitlements são recalculados
        ↓
Auditoria + métricas
```

### 12.2 Regra essencial

**Criação do checkout ou assinatura não equivale a pagamento confirmado.**

Entitlements pagos só ficam ativos conforme política explícita e evento/consulta autoritativa do provider.

### 12.3 `externalReference`

Usar UUID/identificador interno sem dados pessoais desnecessários.

---

## 13. Webhooks financeiros

### 13.1 Requisitos mínimos

O endpoint de webhook Asaas deve:

1. ser dedicado;
2. validar o `asaas-access-token` conforme documentação oficial;
3. nunca reutilizar a API key como auth token de webhook;
4. considerar allowlist de IP oficial somente se a topologia de proxy permitir validação confiável;
5. validar tamanho e forma do payload;
6. aceitar novos campos desconhecidos sem quebrar;
7. persistir o evento;
8. deduplicar pelo ID oficial do evento;
9. retornar 2xx rapidamente;
10. processar regra financeira de forma idempotente;
11. registrar falha sem vazar segredo;
12. permitir reprocessamento seguro;
13. manter reconciliação por API como defesa contra perda/atraso de eventos.

### 13.2 Inbox de eventos

Criar armazenamento semelhante a:

```text
BillingWebhookEvent
- id interno
- provider
- providerEventId UNIQUE
- eventType
- receivedAt
- processedAt
- status
- attemptCount
- nextAttemptAt
- payload sanitizado/criptografado conforme necessidade
- lastErrorCode
- correlationId
```

### 13.3 Sem fila externa no primeiro momento

Como a SoIZI hoje não possui broker/worker, implementar inicialmente uma **durable inbox no PostgreSQL** com processador isolado. A estratégia de disparo deve ser escolhida somente após consultar a documentação oficial do runtime/deploy vigente.

O desenho deve permitir no futuro trocar o executor por queue/worker sem mudar o contrato de domínio.

---

## 14. Reconciliação financeira

Webhook é principal mecanismo de atualização, mas não a única fonte.

Criar serviço de reconciliação que possa:

- recuperar customer do provider;
- recuperar subscription;
- recuperar cobranças da assinatura;
- comparar estado local x remoto;
- registrar divergência;
- corrigir estados derivados quando seguro;
- exigir intervenção humana para divergências destrutivas;
- registrar auditoria.

O Control Plane deve ter ação de **Reconciliar agora** para operadores autorizados.

---

## 15. Estados internos de billing

Não copiar cegamente um único `status` do provider.

Separar pelo menos:

### 15.1 Subscription lifecycle

Exemplo conceitual:

```text
DRAFT
PENDING_CHECKOUT
PENDING_PAYMENT
ACTIVE
GRACE_PERIOD
SUSPENDED
CANCEL_PENDING
CANCELED
EXPIRED
ERROR
```

Os estados finais e transições devem ser definidos após mapear os eventos/status oficiais atuais do Asaas.

### 15.2 Charge lifecycle

Manter estado de cada cobrança separadamente da assinatura.

### 15.3 Regra de acesso

Política de acesso em `past_due`/atraso deve ser decisão de produto da SoIZI e não uma tradução cega do provider.

---

## 16. Descontos, cupons e concessões

### 16.1 Não alterar preço do plano por cliente

Preço de catálogo permanece imutável.

### 16.2 Entidades distintas

**Coupon/Promotion**  
Regra comercial reutilizável.

**Redemption**  
Uso de cupom por organização/assinatura.

**Commercial Grant**  
Concessão manual, cortesia ou benefício excepcional.

### 16.3 Commercial Grant

Deve exigir:

- organização;
- motivo obrigatório;
- operador;
- início;
- expiração ou declaração explícita de permanente;
- features/limites concedidos;
- ticket/referência opcional;
- auditoria before/after;
- step-up para concessões de alto impacto.

Não usar “plano grátis fake” para resolver cortesias.

---

## 17. IAM interno do Control Plane

### 17.1 Evolução do `INTERNAL_MASTER_EMAILS`

A allowlist atual deve permanecer como mecanismo de **break-glass/bootstrap**, não como mecanismo normal de operação diária.

Criar IAM interno com roles específicas.

### 17.2 Roles internas iniciais

- `PLATFORM_OWNER`
- `PLATFORM_ADMIN`
- `CUSTOMER_ADMIN`
- `BILLING_ADMIN`
- `PRODUCT_ADMIN`
- `SUPPORT_AGENT`
- `SECURITY_ADMIN`
- `AUDITOR`
- `OPS_ADMIN`

### 17.3 Permissions internas

Exemplos:

- `platform.organizations.read`
- `platform.organizations.update`
- `platform.users.read`
- `platform.users.suspend`
- `platform.billing.read`
- `platform.billing.refund`
- `platform.catalog.publish`
- `platform.entitlements.override`
- `platform.security.reset_2fa`
- `platform.support.access_request`
- `platform.audit.read`

### 17.4 Least privilege

Nenhuma role deve receber poder global por conveniência.

Billing Admin não precisa ler receitas do cliente. Support Agent não precisa editar planos. Product Admin não precisa resetar 2FA.

---

## 18. Privileged sessions e step-up

Operações de alto risco devem exigir sessão privilegiada curta.

### 18.1 Exemplos

- criar/alterar Platform Admin;
- mudar assinatura manualmente;
- conceder plano/cortesia;
- resetar 2FA;
- suspender organização;
- exclusão destrutiva;
- refund;
- futura transferência financeira;
- suporte com acesso a conteúdo do cliente.

### 18.2 Ativação

Base inspirada em práticas de PIM/JIT:

- MFA obrigatório;
- justificativa;
- duração curta;
- ticket opcional;
- expiração automática;
- auditoria;
- aprovação para ações críticas em fase avançada.

---

## 19. Suporte e acesso a dados do cliente

### 19.1 Regra padrão

Funcionário SoIZI **não recebe acesso automático ao conteúdo dos clientes**.

O Control Plane deve operar por metadata sempre que possível.

Exemplo permitido:

```text
Organização ABC
15 usuários
438 tabelas
última atividade ontem
3 falhas de webhook
```

Sem abrir automaticamente as 438 tabelas.

### 19.2 Suporte privilegiado futuro

Se for implementado “acesso de suporte”:

- nunca compartilhar senha;
- nunca assumir sessão silenciosamente;
- criar sessão de suporte identificada;
- motivo obrigatório;
- duração;
- consentimento quando aplicável;
- banner visual permanente durante a sessão;
- ações atribuídas ao operador real;
- audit log separado;
- possibilidade de revogação imediata.

Não implementar impersonation no MVP sem necessidade real.

---

## 20. Auditoria

### 20.1 Eventos obrigatórios

Auditar:

- login/admin login;
- ativação de sessão privilegiada;
- criação/remoção de operador;
- mudança de role;
- criação/publicação de plano;
- mudança de price;
- mudança de assinatura;
- override de entitlement;
- cupom/concessão;
- suspensão/reativação de organização;
- reset de senha/2FA por admin;
- token API;
- webhook financeiro relevante;
- reconciliação manual;
- refunds;
- acesso de suporte;
- futura transferência financeira.

### 20.2 Conteúdo

Registrar quando aplicável:

- `actorUserId`;
- `actorPlatformRole`;
- `organizationId` afetada;
- ação;
- recurso/tipo/id;
- before sanitizado;
- after sanitizado;
- motivo;
- correlationId;
- IP/user agent apropriados;
- resultado;
- timestamp.

### 20.3 Proteção

O aplicativo normal não deve expor update/delete de audit log. Acesso aos logs deve também ser auditado.

---

## 21. Multi-tenancy e segurança de dados

### 21.1 Risco atual

A SoIZI não possui PostgreSQL RLS e depende de filtros da aplicação.

### 21.2 Requisito desta iniciativa

Toda entidade tenant-scoped nova deve:

- ter `organizationId` explícito;
- possuir índice apropriado;
- ser consultada por chave composta/escopo tenant;
- ter testes cross-tenant;
- nunca aceitar `organizationId` do cliente como fonte de autoridade;
- derivar tenant da sessão/contexto verificado.

### 21.3 Control Plane

Queries globais existem apenas em serviços server-only explicitamente privilegiados.

Não reutilizar repository global dentro do Application Plane.

---

## 22. Onboarding de organização

Onboarding deve ser orquestrado e repetível.

Fluxo alvo:

```text
Criar Organization
  ↓
Criar/associar owner
  ↓
Criar billing customer
  ↓
Criar subscription/trial conforme origem
  ↓
Aplicar plan version
  ↓
Materializar entitlements
  ↓
Criar defaults de profiles/modules
  ↓
Registrar auditoria
  ↓
Ativar organização
```

Falha no meio deve produzir estado recuperável, não tenant parcialmente “ativo”.

---

## 23. Offboarding/suspensão

Separar:

- suspensão por inadimplência;
- suspensão administrativa;
- cancelamento comercial;
- exclusão solicitada;
- retenção/deleção de dados.

Não apagar dados automaticamente ao primeiro cancelamento.

Política de retenção deverá ser definida juridicamente e tecnicamente antes de delete irreversível.

---

## 24. Métricas SaaS

Instrumentar desde a implementação.

### 24.1 Por organização

- usuários/seats;
- usuários ativos;
- tabelas;
- ingredientes;
- extrações IA;
- exportações;
- projetos Enterprise;
- API requests;
- custos de IA quando disponíveis;
- falhas;
- atividade recente;
- plano/versão;
- receita recorrente atribuída;
- uso de quotas.

### 24.2 Globais

- organizações ativas;
- trials;
- conversão;
- MRR/ARR estimados;
- churn;
- past due;
- tickets/incidentes;
- consumo por feature;
- margem estimada por tenant/tier quando houver dados suficientes.

Métricas financeiras devem ser derivadas de dados reconciliados, não de checkout criado.

---

## 25. Páginas do Control Plane

Criar progressivamente:

```text
/admin
/admin/organizations
/admin/organizations/[id]
/admin/users
/admin/catalog/plans
/admin/catalog/plans/[id]
/admin/catalog/features
/admin/billing/subscriptions
/admin/billing/charges
/admin/billing/reconciliation
/admin/commercial/coupons
/admin/commercial/grants
/admin/security/operators
/admin/security/privileged-sessions
/admin/security/events
/admin/audit
/admin/integrations
/admin/system/health
```

Rotas exatas podem ser refinadas mantendo a separação de domínio.

---

## 26. Integração Asaas — regras obrigatórias

1. usar Sandbox durante desenvolvimento;
2. URL de produção somente via configuração server-side;
3. API key fora do frontend;
4. checkout hospedado preferencial para cartão;
5. `externalReference` interno;
6. armazenar IDs oficiais retornados;
7. webhook autenticado;
8. webhook idempotente;
9. não considerar criação como pagamento;
10. reconciliar assinatura e cobranças;
11. ignorar campos desconhecidos de webhook;
12. timeouts/retries somente conforme documentação oficial e com proteção contra duplicidade;
13. testar aprovação e recusa de cartão;
14. testar atraso, cancelamento, duplicidade e reenvio;
15. não habilitar comportamento Pix recorrente sem homologação da documentação vigente + Sandbox;
16. registrar versão/data das páginas oficiais usadas.

---

## 27. Cora — política desta fase

A Cora não terá credenciais dentro da SoIZI no MVP.

O saldo recebido no Asaas será transferido operacionalmente para a Cora.

Isso é deliberado.

A API Cora permanece uma opção futura para:

- consulta/read-only de extrato;
- reconciliação de tesouraria;
- automação de cobrança alternativa;
- transferências/pagamentos, somente após threat model específico.

Integração futura deverá seguir os requisitos oficiais de autenticação/mTLS/OAuth/Idempotency-Key conforme modalidade contratada.

---

## 28. Migrations e legado de billing

Antes de criar qualquer modelo novo:

1. inventariar migrations históricas;
2. listar objetos realmente existentes no banco local;
3. comparar com `schema.prisma` atual;
4. identificar tabelas/enums históricos de billing/marketing;
5. não reutilizar nomes sem verificar colisão;
6. criar ADR de reconciliação;
7. fazer backup antes de ambiente remoto;
8. usar migrations aditivas;
9. evitar drop/rename destrutivo na primeira fase;
10. testar upgrade a partir de banco representativo.

---

## 29. Estratégia de desenvolvimento por etapas

### Etapa 0 — Baseline e pesquisa

Entregáveis:

- inventário do schema/migrations;
- mapa de módulos atuais;
- mapa de autorização;
- fontes oficiais registradas;
- plano de mudanças reais ajustado ao código.

**Gate:** nenhuma migration criada antes do baseline.

### Etapa 1 — Reconciliação de banco

Entregáveis:

- relatório de divergência histórica;
- migration strategy;
- testes de migration;
- nenhum dado real perdido.

### Etapa 2 — IAM interno + shell `/admin`

Entregáveis:

- roles/permissions internas;
- guard server-side;
- layout separado;
- audit de acesso;
- `INTERNAL_MASTER_EMAILS` como bootstrap/break-glass.

### Etapa 3 — Catálogo

Entregáveis:

- FeatureDefinition;
- Plan;
- PlanVersion;
- Price;
- publicação imutável;
- UI administrativa inicial.

### Etapa 4 — Entitlements

Entregáveis:

- resolvedor central;
- limites;
- materialização/derivação;
- compatibilidade com módulos existentes;
- testes de precedência.

### Etapa 5 — Provider abstraction + Asaas Sandbox

Entregáveis:

- adapter server-only;
- client oficial baseado na referência atual;
- envs Sandbox;
- health/diagnostic seguro;
- criação/consulta de customer em teste.

### Etapa 6 — Checkout/Subscription

Entregáveis:

- fluxo de checkout hospedado;
- customer mapping;
- subscription interna;
- charges internas;
- callbacks sem confiar no redirect como confirmação.

### Etapa 7 — Webhooks/Reconciliation

Entregáveis:

- auth token;
- inbox idempotente;
- processador;
- reprocessamento;
- reconciliação;
- cenários de duplicidade/falha.

### Etapa 8 — Customer admin

Entregáveis:

- detalhe da organização;
- assinatura;
- membros;
- seats;
- status;
- ações permitidas.

### Etapa 9 — Coupons/Grants

Entregáveis:

- promoção;
- redemption;
- grant manual;
- expiração;
- auditoria;
- step-up nas ações críticas.

### Etapa 10 — Metrics

Entregáveis:

- consumo por tenant;
- dashboards;
- quotas;
- métricas financeiras reconciliadas.

### Etapa 11 — Privilege hardening

Entregáveis:

- privileged sessions;
- step-up;
- expiração;
- possível approval workflow;
- suporte controlado, se necessário.

### Etapa 12 — Rollout

Entregáveis:

- E2E;
- Sandbox completo;
- backup;
- migration dry-run;
- feature flags;
- piloto;
- observação;
- produção gradual.

---

## 30. Critérios de aceite globais

A iniciativa somente pode ser considerada concluída quando:

- nenhum cliente consegue acessar outro tenant;
- nenhum operador não autorizado acessa `/admin`;
- permissão interna é granular;
- plano não está codificado em ifs espalhados;
- versões de plano preservam contratos antigos;
- entitlements são server-authoritative;
- Asaas está encapsulado em provider adapter;
- nenhum dado de cartão passa pelo backend no fluxo padrão;
- webhook é autenticado e idempotente;
- duplicidade de webhook não duplica efeitos;
- queda temporária não perde evento sem possibilidade de reconciliação;
- criação de checkout não concede acesso pago indevidamente;
- migration foi testada a partir do schema legado;
- audit log cobre ações críticas;
- operações perigosas exigem step-up conforme matriz;
- Sandbox do Asaas passou nos cenários documentados;
- rollback e recuperação foram testados;
- diário de implementação está atualizado;
- links oficiais usados estão registrados.

---

## 31. Regras de código para o Codex

- Não alterar arquitetura atual sem justificar.
- Não criar dependência nova sem verificar necessidade e documentação oficial.
- Não criar segunda implementação de autorização paralela.
- Não duplicar validações existentes: centralizar.
- Não usar `organizationId` vindo do formulário como autoridade.
- Não misturar UI client com Prisma/segredos.
- Não registrar segredos em logs.
- Não hardcodar preço, taxa do PSP ou URL de ambiente.
- Não hardcodar plano em regra funcional.
- Não fazer writes financeiros em GET.
- Não confiar em redirect de checkout como confirmação.
- Não apagar migration existente aplicada.
- Não editar migration histórica aplicada.
- Não usar `db push` em produção.
- Não executar operações destrutivas no banco remoto sem backup e plano de rollback.
- Não permitir acesso global a conteúdo de tenant apenas por ser operador interno.
- Não automatizar transferência de dinheiro para Cora no MVP.

---

## 32. Fontes arquiteturais oficiais que sustentam o desenho

Estas são referências iniciais. O Codex deve conferir as páginas vigentes no momento da implementação.

### SaaS / multi-tenancy

- AWS SaaS Lens — General design principles  
  https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/general-design-principles.html
- AWS SaaS Lens — Tenant onboarding  
  https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-onboarding.html
- AWS SaaS Lens — Tenant isolation  
  https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html
- AWS SaaS Lens — Tenant activity and consumption  
  https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-activity-and-consumption.html
- AWS SaaS Lens — Full stack isolation / management plane  
  https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/full-stack-isolation.html

### Segurança

- OWASP Multi-Tenant Security Cheat Sheet  
  https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html
- OWASP Authorization Cheat Sheet  
  https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- OWASP Logging Cheat Sheet  
  https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- NIST SP 800-218 SSDF  
  https://csrc.nist.gov/pubs/sp/800/218/final
- Microsoft Entra PIM  
  https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure

### Roles/administração

- GitHub organization roles  
  https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/roles-in-an-organization
- GitHub predefined roles  
  https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/permissions-of-predefined-organization-roles
- Auth0 Organizations  
  https://auth0.com/docs/manage-users/organizations
- Auth0 organization member roles  
  https://auth0.com/docs/manage-users/organizations/configure-organizations/add-member-roles

### Asaas

- Portal oficial  
  https://docs.asaas.com/
- Visão geral  
  https://docs.asaas.com/docs/visao-geral
- Assinaturas  
  https://docs.asaas.com/docs/assinaturas
- Criar assinatura  
  https://docs.asaas.com/reference/criar-nova-assinatura
- Checkout Asaas  
  https://docs.asaas.com/docs/checkout-asaas
- Checkout recorrente  
  https://docs.asaas.com/docs/checkout-with-subscription-recurring
- Webhooks  
  https://docs.asaas.com/docs/sobre-os-webhooks
- Recebimento seguro de webhooks  
  https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook
- Idempotência  
  https://docs.asaas.com/docs/como-implementar-idempotencia-em-webhooks
- Autenticação  
  https://docs.asaas.com/docs/autentica%C3%A7%C3%A3o-1
- PCI-DSS  
  https://docs.asaas.com/docs/pci-dss
- Pix Automático  
  https://docs.asaas.com/docs/pix-automatico
- Transferências externas  
  https://docs.asaas.com/docs/transferencia-para-contas-de-outra-instituicao-pix-ted

### Cora

- Portal oficial Cora API  
  https://developers.cora.com.br/
- Instruções iniciais  
  https://developers.cora.com.br/docs/instrucoes-iniciais
- Integração direta / uso das APIs  
  https://developers.cora.com.br/docs/utiliza%C3%A7%C3%A3o-das-apis
- Autorização/autenticação  
  https://developers.cora.com.br/docs/fluxos-de-autorizacao-e-autenticacao

---

## 33. Resultado esperado

Ao final, a SoIZI deve ter uma arquitetura em que:

```text
Organization
   │
   ├── Memberships ── Roles/Profiles ── Permissions
   │
   ├── Subscription ── PlanVersion ── Price
   │                         │
   │                         └── FeatureEntitlements
   │
   ├── Effective Entitlements / Limits
   │
   ├── Usage / Metrics
   │
   └── Application Data

Platform Operator
   │
   └── Platform Role ── Platform Permission ── Privileged Session

Billing Domain
   │
   └── BillingProvider
           └── AsaasBillingProvider

Treasury
   └── Cora (MVP: operacional/manual)
```

O resultado deve ser administrável, auditável, substituível por provider, seguro por padrão e preparado para crescimento sem transformar plano comercial, permissão e feature em uma mesma coisa.
