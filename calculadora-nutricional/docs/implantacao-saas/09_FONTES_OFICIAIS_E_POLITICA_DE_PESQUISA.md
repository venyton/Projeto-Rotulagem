# SoIZI Control Plane — Fontes Oficiais e Política de Pesquisa

**Verificado inicialmente em:** 25/08/2026

## 1. Finalidade

Este arquivo não congela as APIs. Ele registra o conjunto inicial de fontes oficiais e obriga a equipe/agente a verificar a versão vigente no momento de cada implementação.

## 2. Política obrigatória

Antes de escrever código que dependa de uma API/framework:

1. abrir a documentação oficial;
2. confirmar versão/ambiente;
3. registrar URL e data no diário;
4. conferir endpoint, método, headers, payload, status e limites;
5. conferir autenticação e segurança;
6. conferir changelog/FAQ quando houver ambiguidade;
7. testar em ambiente oficial de teste quando disponível;
8. adicionar teste de contrato.

Fonte secundária só pode complementar.

---

## 3. SoIZI — fonte interna

Documento canônico atual fornecido pela equipe:

`Arquitetura e funcionamento completo do SoIZI` — atualizado em 25/08/2026.

O código e `prisma/schema.prisma` continuam sendo fonte de verdade do runtime; migrations representam a evolução histórica.

---

## 4. AWS — arquitetura SaaS

### General design principles
https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/general-design-principles.html

Aplicações:

- single pane of glass;
- isolamento;
- design for growth;
- tenant metrics;
- onboarding repetível;
- limitar awareness de tenancy no código.

### Tenant onboarding
https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-onboarding.html

### Operate / onboarding automation
https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/operate.html

### Tenant isolation
https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html

### Isolation mindset
https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/isolation-mindset.html

### Tenant activity and consumption
https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-activity-and-consumption.html

### Expenditure awareness / cost per tenant
https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/expenditure-awareness.html

### Full stack isolation / management services
https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/full-stack-isolation.html

---

## 5. OWASP — segurança

### Multi-Tenant Security
https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html

Aplicações:

- tenant context;
- cross-tenant/IDOR;
- DB isolation;
- cache/session isolation;
- rate limiting;
- onboarding/offboarding;
- audit.

### Authorization
https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html

### Logging
https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

Ao implementar secrets, OAuth, session, webhook ou transaction authorization, buscar a cheat sheet oficial correspondente e registrar no diário.

---

## 6. NIST — Secure SDLC

### SP 800-218 — Secure Software Development Framework 1.1 (final)
https://csrc.nist.gov/pubs/sp/800/218/final

Observação em 25/08/2026: há revisão 1 / SSDF 1.2 em draft publicada em 2025; não tratar draft como substituto da versão final sem decisão explícita.

Projeto SSDF:
https://csrc.nist.gov/projects/ssdf

---

## 7. Microsoft — privileged access

### Privileged Identity Management overview
https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure

Princípios aplicados:

- JIT;
- time-bound;
- MFA;
- justification;
- approval;
- audit;
- access reviews.

### Role settings
https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-resource-roles-configure-role-settings

---

## 8. GitHub — roles administrativas

### Organization roles
https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/roles-in-an-organization

### Predefined organization roles
https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/permissions-of-predefined-organization-roles

Princípio aplicado: billing/security/CI/app administration podem ter papéis diferentes; não exigir owner para tudo.

---

## 9. Auth0 — organizações e membership roles

### Organizations
https://auth0.com/docs/manage-users/organizations

### Organizations overview
https://auth0.com/docs/manage-users/organizations/organizations-overview

### Member roles
https://auth0.com/docs/manage-users/organizations/configure-organizations/add-member-roles

Princípio aplicado: usuário pode participar de organizações e roles são contextualizadas à organização.

---

## 10. Slack — auditoria

### Audit Logs
https://slack.com/help/articles/360000394286-Audit-Logs-in-Slack

Princípio aplicado: audit logs pesquisáveis/exportáveis com role própria e uso em segurança.

---

## 11. Asaas — documentação oficial de billing

### Portal
https://docs.asaas.com/

### Visão geral
https://docs.asaas.com/docs/visao-geral

A documentação declara Sandbox e recursos de cobranças/assinaturas/webhooks.

### Autenticação
https://docs.asaas.com/docs/autentica%C3%A7%C3%A3o-1

Confirmar:

- header `access_token`;
- chave por ambiente;
- não expor frontend/log/repo;
- IP restrictions adicionais quando aplicável.

### Assinaturas
https://docs.asaas.com/docs/assinaturas

### Criando assinatura
https://docs.asaas.com/docs/criando-uma-assinatura

### Endpoint criar assinatura
https://docs.asaas.com/reference/criar-nova-assinatura

Em 25/08/2026, a referência descreve uso para SaaS e enum de `billingType` incluindo BOLETO/CREDIT_CARD/PIX. Sempre revalidar antes de codificar.

### Assinatura com cartão
https://docs.asaas.com/docs/criando-assinatura-com-cartao-de-credito
https://docs.asaas.com/reference/criar-assinatura-com-cartao-de-credito

### Checkout
https://docs.asaas.com/docs/checkout-asaas
https://docs.asaas.com/reference/criar-novo-checkout

### Checkout recorrente
https://docs.asaas.com/docs/checkout-with-subscription-recurring

Em 25/08/2026, o exemplo oficial de checkout recorrente apresenta cartão de crédito como billing type. Esta é a base do MVP para minimizar contato SoIZI com dados de cartão.

### PCI-DSS
https://docs.asaas.com/docs/pci-dss

Ponto crítico: a própria documentação descreve responsabilidades diferentes quando dados de cartão passam pelo backend. Por isso o fluxo padrão será hospedado.

### Webhooks
https://docs.asaas.com/docs/sobre-os-webhooks

### Recebimento seguro
https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook

Em 25/08/2026 documenta:

- at-least-once;
- retries;
- possível pausa após falhas;
- processamento rápido/assíncrono;
- `asaas-access-token`;
- IPs oficiais;
- idempotência;
- retenção temporária de eventos no provider.

### Idempotência
https://docs.asaas.com/docs/como-implementar-idempotencia-em-webhooks

### Eventos de assinatura
https://docs.asaas.com/docs/eventos-para-assinaturas

### Pix Automático
https://docs.asaas.com/docs/pix-automatico

### Transferências para outra instituição
https://docs.asaas.com/docs/transferencia-para-contas-de-outra-instituicao-pix-ted
https://docs.asaas.com/reference/transferir-para-conta-de-outra-instituicao-ou-chave-pix

### Preços/taxas
https://www.asaas.com/precos-e-taxas

Taxas mudam e podem variar por contrato. Não hardcodar.

---

### Revalidação de configuração Asaas — 05/10/2026

Foram reabertas as fontes oficiais antes de colocar as credenciais e webhooks
no registro global:

- [Authentication](https://docs.asaas.com/docs/authentication): chave por
  ambiente, prefixos `$aact_hmlg_`/`$aact_prod_`, hosts Sandbox/Produção,
  header `access_token` e recomendação de armazenar a chave em vault.
- [Create a new Webhook through the API](https://docs.asaas.com/docs/create-new-webhook-via-api):
  `name`, `url`, `email`, `enabled`, `interrupted`, `authToken`, `sendType`,
  `events`, limite de webhooks, token e entrega at-least-once.
- [Create new Webhook](https://docs.asaas.com/reference/create-new-webhook):
  contrato `POST /v3/webhooks`, `apiVersion`, autenticação e ID retornado.
- [Update Existing Webhook](https://docs.asaas.com/reference/update-existing-webhook):
  contrato `PUT /v3/webhooks/{id}` e campos editáveis da configuração existente.
- [List Webhooks](https://docs.asaas.com/reference/list-webhooks):
  contrato `GET /v3/webhooks`, paginação e leitura dos IDs existentes.
- [Webhook Events](https://docs.asaas.com/docs/webhooks-events): categorias,
  header de recebimento e idempotência.
- [Events for Payments](https://docs.asaas.com/docs/payment-events),
  [Events for subscriptions](https://docs.asaas.com/docs/subscription-events) e
  [Events for Checkout](https://docs.asaas.com/docs/checkout-events): validação
  da allowlist que o processador SoIZI aceita.

Limite de implementação: a interface permite somente eventos já reconhecidos
pela inbox/processador SoIZI. `email` e `apiVersion` são enviados na criação;
a referência oficial de atualização consultada não os lista entre os campos de
`PUT`.

---

## 12. Divergência oficial conhecida a observar — Pix recorrente

Em 25/08/2026, materiais oficiais do Asaas apresentam recursos de Pix em assinaturas/Pix Automático, enquanto outra documentação de “formas de cobrança” associada a fluxos/plugins descreve limitações de Pix recorrente tradicional e uso de boleto com QR Pix.

**Regra:** não tratar isso como erro a ser “resolvido por interpretação”. Na implementação:

1. consultar docs atualizadas do endpoint pretendido;
2. confirmar produto/fluxo específico (API direta, Checkout, plugin, Pix Automático);
3. validar no Sandbox;
4. documentar resultado;
5. só então habilitar feature flag.

---

## 13. Cora — documentação oficial

### Portal
https://developers.cora.com.br/

A página oficial descreve APIs de cobrança, gestão financeira, pagamentos, transfers e webhooks, além de modalidades de integração.

### Instruções iniciais
https://developers.cora.com.br/docs/instrucoes-iniciais

### Utilização das APIs / integração direta
https://developers.cora.com.br/docs/utiliza%C3%A7%C3%A3o-das-apis

Em 25/08/2026 descreve certificado/chave + token para Integração Direta.

### Fluxos de autorização/autenticação
https://developers.cora.com.br/docs/fluxos-de-autorizacao-e-autenticacao

### Client Credentials integração direta
https://developers.cora.com.br/docs/client-credentials-int-direta

### Boleto v2 / Idempotency-Key
https://developers.cora.com.br/reference/emiss%C3%A3o-de-boleto-registrado-v2

### Taxas Cora API
https://developers.cora.com.br/

A página apresenta valores/tarifas, mas devem ser conferidos na contratação vigente.

---

## 14. Frameworks da própria SoIZI

Ao tocar nessas áreas, consultar docs oficiais da versão instalada antes da alteração:

- Next.js: https://nextjs.org/docs
- React: https://react.dev/
- Prisma: https://www.prisma.io/docs
- PostgreSQL: https://www.postgresql.org/docs/
- NextAuth/Auth.js: documentação oficial compatível com a versão realmente instalada
- Vercel: https://vercel.com/docs
- TypeScript: https://www.typescriptlang.org/docs/
- Zod: documentação oficial do projeto/versão utilizada

Não assumir API de versão nova em pacote antigo.

---

## 15. Checklist de pesquisa do Codex

Antes de concluir uma subetapa, responder no diário:

- [ ] Qual contrato externo estou implementando?
- [ ] Qual a documentação oficial vigente?
- [ ] Qual versão/ambiente?
- [ ] Autenticação foi conferida?
- [ ] Rate limit/timeout/retry foram conferidos?
- [ ] Idempotência foi conferida?
- [ ] Webhook/eventos foram conferidos?
- [ ] Segurança e dados sensíveis foram conferidos?
- [ ] Sandbox/teste oficial existe?
- [ ] Há changelog/FAQ relevante?
- [ ] Existe divergência entre páginas?
- [ ] O comportamento foi validado por teste de contrato?
