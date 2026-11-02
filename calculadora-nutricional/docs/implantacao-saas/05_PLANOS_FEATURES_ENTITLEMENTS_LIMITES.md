# SoIZI — Planos, Features, Entitlements, Seats e Limites

## 1. Objetivo

Definir o sistema comercial sem acoplá-lo a autorização individual nem ao provider de pagamento.

## 2. Camadas

```text
Plan
  ↓
PlanVersion
  ↓
Price

PlanVersion
  ↓
FeatureDefinition + limite
  ↓
Effective Organization Entitlement

OrganizationMember
  ↓
Profile/Role
  ↓
Permission
```

Entitlement responde “a organização pode?”. Permission responde “esta pessoa pode?”.

---

## 3. Module x Feature

### Module

Área grande do produto, usada também para navegação e coarse access.

### Feature

Capacidade comercial granular.

Exemplo:

```text
Module: TECHNICAL_SHEETS
Features:
- technical_sheet_import
- technical_sheet_ai
- technical_sheet_ai_monthly_limit
- bulk_technical_sheet_import
```

---

## 4. Feature keys

Keys devem ser:

- ASCII/slug;
- estáveis;
- sem nome de plano;
- semanticamente claras;
- não reutilizadas.

Bom:

```text
api_access
auto_fop
enterprise_workflow
ai_imports_monthly
seats_max
international_market_us
```

Ruim:

```text
pro_feature_1
premium_enabled
starter_limit
```

---

## 5. Starter/Standard/Pro

Os nomes podem existir no catálogo, mas nenhuma regra de aplicação deve depender deles diretamente.

A composição será configurada em `PlanVersionFeature`.

Isso permite:

- Pro 2026;
- Pro 2027;
- grandfathering;
- preço anual diferente;
- plano legado;
- piloto Enterprise.

---

## 6. Quotas

Tipos iniciais:

- seats;
- AI imports/month;
- API requests/month;
- projects Enterprise;
- export count, se comercialmente necessário;
- storage, se medido de forma confiável.

### Regra

Quota deve ter:

```text
period
limit
usage
remaining
resetAt
source
```

O limite efetivo vem do entitlement, não da UI.

---

## 7. Seats

Seats representam memberships billable/permitidas, não permission level.

Definir claramente quais statuses contam:

- ACTIVE conta;
- INVITED? decisão de produto;
- SUSPENDED? decisão de produto;
- OWNER conta normalmente, salvo política explícita.

A regra deve ser única e testada.

Ao atingir limite:

- impedir nova membership/invite conforme política;
- nunca remover usuário automaticamente;
- admin pode aumentar plano/add-on;
- manual override é auditado.

---

## 8. Trial

Trial é estado comercial temporal, não plano duplicado.

Campos:

```text
startsAt
endsAt
trialPlanVersionId
conversionTargetPriceId
```

Expiração deve ser processada de forma determinística.

Não depender apenas de job diário para autorização; entitlement resolver deve considerar `endsAt` em tempo real.

---

## 9. Add-ons

Preparar domínio para add-on, mas não é obrigatório no primeiro release.

Exemplos:

- +10 seats;
- +100 AI imports;
- API premium;
- mercado internacional adicional.

Add-on pode conceder entitlement sem mudar plan version.

---

## 10. Commercial grants

Uso:

- cliente piloto;
- parceiro;
- compensação de suporte;
- cortesia;
- contrato especial.

Nunca alterar plan version global para atender um cliente.

Grant precisa de expiração/motivo/auditoria.

---

## 11. Overrides

Override é mais perigoso que grant normal.

Exemplo:

```text
disable technical_sheet_ai for org X despite plan
```

Pode ser usado para:

- segurança;
- abuso;
- compliance;
- incidente;
- exceção contratual.

Sempre registrar source/reason/actor.

---

## 12. Coupon x grant

Coupon:

- afeta condição comercial/preço;
- normalmente entra na contratação.

Grant:

- concede capability/benefício diretamente;
- pode existir sem alterar cobrança.

Não confundir.

---

## 13. Publicação de plano

Fluxo:

```text
Draft PlanVersion
    ↓
configurar features
    ↓
configurar prices
    ↓
validar invariantes
    ↓
preview de diferenças
    ↓
publicar
    ↓
imutável
```

Validações antes de publish:

- pelo menos um price ativo se plano pago;
- currency suportada;
- amount > 0;
- feature keys existentes;
- quota >= 0;
- nenhuma combinação impossível;
- versionNumber nova;
- audit event.

---

## 14. Mudança de plano

Nunca substituir `planVersionId` sem histórico.

Criar evento/transição comercial com:

- old plan version;
- new plan version;
- effective date;
- proration policy (somente após definir com provider/docs);
- actor/customer initiated;
- provider update result;
- audit.

Não inventar proration. Se Asaas não oferecer comportamento adequado, implementar política interna explícita após pesquisa oficial.

---

## 15. Entitlement resolver e caching

Primeira versão pode resolver do banco diretamente.

Se caching for introduzido:

- chave inclui organizationId;
- invalidar em subscription/grant/plan change;
- TTL curto;
- nunca confiar em cache sem tenant context;
- teste de vazamento cross-tenant.

---

## 16. UX

Cliente vê:

- plano atual;
- limites;
- consumo;
- próxima cobrança quando reconciliada;
- features disponíveis;
- opções de upgrade.

Operador vê:

- fonte do entitlement;
- plan version;
- grants;
- overrides;
- billing sync;
- uso.

Não expor detalhes internos de segurança ao cliente.

---

## 17. Testes obrigatórios

- Starter não acessa feature ausente;
- Pro antigo mantém feature histórica;
- nova versão não altera cliente grandfathered;
- grant temporário expira;
- override vence plano;
- seat count concorrente não ultrapassa limite silenciosamente;
- quota reset no período correto;
- tenant A quota não afeta B;
- frontend não consegue forçar entitlement;
- member com permission mas org sem entitlement é negado;
- org com entitlement mas member sem permission é negado quando permission for necessária.
