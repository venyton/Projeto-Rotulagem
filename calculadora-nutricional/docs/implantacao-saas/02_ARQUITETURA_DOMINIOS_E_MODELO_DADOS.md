# SoIZI Control Plane — Arquitetura de Domínios e Modelo de Dados

**Complementa:** `01_PLANO_MESTRE_CONTROL_PLANE_SOIZI.md`

## 1. Objetivo

Definir fronteiras de domínio, entidades propostas, invariantes e estratégia de evolução do schema. Este documento é **propositivo**: antes de criar migrations o Codex deve comparar cada item com `prisma/schema.prisma` e o banco/migrations reais.

## 2. Bounded contexts

### 2.1 Identity & Tenant

Já existente e autoritativo para:

- `User`;
- `Organization`;
- `OrganizationMember`;
- profiles;
- grants;
- organization status;
- tenant context.

Não duplicar usuário ou organização no domínio de billing.

### 2.2 Product Catalog

Responsável por:

- módulos;
- features;
- planos;
- versões;
- preços;
- add-ons;
- publicação/arquivamento.

### 2.3 Entitlements

Responsável por resolver:

- acesso booleano;
- quota;
- seats;
- validade;
- overrides;
- grants;
- uso consumido.

### 2.4 Billing

Responsável por:

- mapping Organization ↔ customer do PSP;
- checkout;
- assinatura;
- cobranças;
- status financeiro;
- webhooks;
- reconciliação;
- provider adapter.

### 2.5 Commercial Operations

Responsável por:

- coupons/promotions;
- redemptions;
- trials;
- commercial grants;
- exceções comerciais.

### 2.6 Platform IAM

Responsável por:

- operadores internos;
- roles internas;
- permissions internas;
- privileged sessions;
- break-glass.

### 2.7 Audit & Security

Extensão do `SecurityAuditLog` existente para:

- eventos internos;
- billing;
- overrides;
- suporte;
- acessos privilegiados.

### 2.8 Metering & Analytics

Responsável por:

- usage counters;
- quotas;
- tenant activity;
- agregados SaaS;
- custo/consumo quando disponível.

---

## 3. Entidades propostas

Os nomes finais devem respeitar convenções existentes.

### 3.1 `FeatureDefinition`

```text
id
key UNIQUE                 # string estável, não nome visual
name
description
moduleKey                  # referência/coarse module
type                       # BOOLEAN | QUOTA | METERED | SEAT_LIMIT
unit                       # opcional: imports, users, requests...
isActive
defaultValueJson           # somente se necessário e validado
createdAt
updatedAt
```

**Invariantes:**

- `key` nunca reutilizada com outro significado;
- desativar não apaga histórico;
- tipo não deve mudar após uso sem migration explícita.

### 3.2 `Plan`

```text
id
key UNIQUE
name
description
status                     # DRAFT | ACTIVE | ARCHIVED
createdAt
updatedAt
```

Não guardar composição mutável diretamente aqui.

### 3.3 `PlanVersion`

```text
id
planId
versionNumber
status                     # DRAFT | PUBLISHED | RETIRED
publishedAt
validFrom
createdByUserId
createdAt
```

Constraint: `(planId, versionNumber)` única.

Depois de `PUBLISHED`, alterações materiais são proibidas.

### 3.4 `PlanVersionFeature`

```text
id
planVersionId
featureDefinitionId
enabled
limitValue                 # Decimal/BigInt quando aplicável
configJson                 # somente metadata validada, evitar regra arbitrária
```

### 3.5 `BillingPrice`

```text
id
planVersionId
provider                   # ASAAS inicialmente
providerPriceRef           # se provider possuir conceito aplicável
currency                   # BRL
amountMinor                # centavos, inteiro
billingInterval            # MONTHLY | YEARLY ...
status                     # ACTIVE | ARCHIVED
createdAt
archivedAt
```

**Regra:** dinheiro em centavos/inteiro ou Decimal consistente; nunca float JS como fonte de verdade financeira.

### 3.6 `BillingCustomer`

```text
id
organizationId UNIQUE
provider
providerCustomerId
status
createdAt
updatedAt
lastSyncedAt
```

Organization é o tenant; BillingCustomer é mapping externo.

### 3.7 `OrganizationSubscription`

```text
id
organizationId
billingCustomerId
planVersionId
billingPriceId
provider
providerSubscriptionId
providerCheckoutId
status
startedAt
currentPeriodStart
currentPeriodEnd
cancelAtPeriodEnd
canceledAt
endedAt
trialEndsAt
lastSyncedAt
createdAt
updatedAt
```

Adicionar constraint de assinatura ativa conforme regra de negócio. Não assumir múltiplas assinaturas antes de decidir add-on model.

### 3.8 `BillingCheckoutAttempt`

```text
id
organizationId
billingPriceId
initiatedByUserId
provider
providerCheckoutId
externalReference UNIQUE
status
expiresAt
createdAt
completedAt
```

Ajuda a correlacionar redirect, webhook e suporte.

### 3.9 `BillingCharge`

```text
id
organizationId
subscriptionId
provider
providerChargeId UNIQUE
status
amountMinor
dueDate
paidAt
confirmedAt
refundedAt
invoiceUrlOrProviderUrl?   # somente se seguro e necessário
createdAt
updatedAt
lastSyncedAt
```

### 3.10 `BillingWebhookEvent`

Conforme plano mestre:

```text
providerEventId UNIQUE
provider
eventType
status
receivedAt
processedAt
attemptCount
nextAttemptAt
correlationId
payloadJson                # minimizado/sanitizado conforme threat model
lastErrorCode
```

Não guardar secrets/headers desnecessários.

### 3.11 `CommercialCoupon`

```text
id
codeNormalized UNIQUE
name
discountType               # PERCENT | FIXED
value
currency                    # quando FIXED
startsAt
endsAt
maxRedemptions
maxRedemptionsPerOrganization
appliesToPlanIds/config
status
createdByUserId
createdAt
```

O código normalizado deve ser case-insensitive de forma determinística.

### 3.12 `CouponRedemption`

```text
id
couponId
organizationId
subscriptionId
redeemedAt
revokedAt
appliedValueSnapshot
```

### 3.13 `CommercialGrant`

```text
id
organizationId
sourceType                 # COURTESY | PARTNER | SUPPORT | MIGRATION | OTHER
reason
startsAt
expiresAt
createdByUserId
revokedAt
revokedByUserId
metadataJson
createdAt
```

### 3.14 `CommercialGrantFeature`

```text
grantId
featureDefinitionId
enabled
limitValue
```

### 3.15 `PlatformRole`

Pode ser enum inicial ou tabela. Para evolução, tabela + key estável é preferível se o sistema precisa customizar permissões internas no futuro.

```text
id
key UNIQUE
name
description
isSystem
```

### 3.16 `PlatformPermission`

```text
id
key UNIQUE
name
description
riskLevel                  # LOW | MEDIUM | HIGH | CRITICAL
```

### 3.17 `PlatformRolePermission`

Many-to-many.

### 3.18 `PlatformAdminAssignment`

```text
id
userId
platformRoleId
status
startsAt
expiresAt
assignedByUserId
createdAt
```

### 3.19 `PrivilegedSession`

```text
id
userId
purpose
status
startedAt
expiresAt
mfaVerifiedAt
justification
ticketReference
ipHashOrSafeRepresentation
revokedAt
createdAt
```

Não armazenar TOTP secret/código.

### 3.20 `UsageCounter` / `UsageAggregate`

Evitar lançar uma linha por microevento sem necessidade. Separar event ingestion de agregação apenas onde houver valor.

Exemplo mensal:

```text
organizationId
featureKey
periodStart
periodEnd
quantity
lastUpdatedAt
```

Unique: `(organizationId, featureKey, periodStart)`.

---

## 4. Relação com modelos existentes

### 4.1 `OrganizationEntitlement`

Não criar um segundo conceito sem necessidade.

Antes de migration, inspecionar o modelo atual e escolher uma estratégia:

**Opção A — evoluir `OrganizationEntitlement`:**  
adequado se o modelo atual puder receber `featureKey`, source, validity e limit.

**Opção B — manter `OrganizationEntitlement` como módulo coarse e criar `OrganizationFeatureEntitlement`:**  
adequado se mudar o contrato atual tiver alto risco.

A decisão deve constar no diário e em ADR.

### 4.2 `ParticipantModuleGrant`

Continua sendo concessão de módulo/permissão para pessoa, não entitlement comercial da organização.

Não fundir.

### 4.3 `SecurityAuditLog`

Preferir evoluir o modelo/serviço existente a criar um audit log paralelo.

---

## 5. Resolução de entitlement

Pseudofluxo:

```text
resolveEntitlement(organizationId, featureKey, atTime)
    ↓
verificar Organization.status
    ↓
verificar security/compliance blocks
    ↓
coletar subscription + planVersion
    ↓
coletar add-ons
    ↓
coletar grants válidos
    ↓
coletar override explícito
    ↓
aplicar precedência determinística
    ↓
retornar EffectiveEntitlement
```

Retorno conceitual:

```text
{
  featureKey,
  enabled,
  limit,
  source,
  validUntil,
  reasonCode
}
```

Não retornar motivo administrativo sensível ao cliente se não for necessário.

---

## 6. Estado vs evento

- Banco local guarda estado operacional atual.
- Webhook guarda evento recebido.
- Audit log guarda mudança atribuível.
- PlanVersion/Price guardam histórico comercial.
- BillingCharge guarda ciclo financeiro.

Não usar audit log como banco operacional e não usar webhook event como fonte direta de UI sem projeção validada.

---

## 7. Constraints mínimas

- `BillingCustomer.organizationId` único;
- IDs de provider únicos no escopo correto;
- `providerEventId` único;
- plan version única por plano;
- coupon code normalizado único;
- usage aggregate único por período/feature/tenant;
- FKs com delete behavior explicitamente revisado;
- índices por `organizationId` em entidades tenant-scoped;
- índices para status/retry de webhook.

---

## 8. Estratégia de migration

1. inventariar objetos históricos de billing;
2. criar migrations somente após ADR;
3. adicionar tabelas/colunas primeiro;
4. backfill determinístico;
5. ativar código de leitura compatível;
6. ativar writes novos;
7. somente depois considerar limpeza de objetos históricos;
8. limpeza destrutiva em release separado.

---

## 9. Testes de dados obrigatórios

- cross-tenant em todos os novos repositories;
- duplicate provider event;
- coupon race/double redemption;
- concurrent checkout attempt;
- plan version immutability;
- entitlement precedence;
- grant expiration;
- subscription reconciling to provider;
- migration de banco com objetos históricos presentes;
- rollback lógico quando provider falha após write local.

---

## 10. Anti-patterns proibidos

- `User.plan`;
- `Organization.plan` como única fonte de verdade;
- preço em string arbitrária;
- valor financeiro em float sem política;
- `if plan === PRO` em features;
- uma tabela “Settings” com JSON contendo todo o billing;
- provider payload usado diretamente na UI;
- FK para ID Asaas como primary key interna;
- usar email como chave permanente de customer;
- apagar assinatura antiga para “trocar de plano”;
- dar grant individual para resolver entitlement da organização.
