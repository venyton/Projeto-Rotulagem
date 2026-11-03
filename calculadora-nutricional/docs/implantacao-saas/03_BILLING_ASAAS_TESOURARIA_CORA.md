# SoIZI — Billing Asaas e Tesouraria Cora

**Status:** especificação auxiliar oficial  
**Provider de billing MVP:** Asaas  
**Tesouraria:** Cora  
**Regra:** documentação oficial vigente é obrigatória antes de cada endpoint ser implementado.

## 1. Decisão arquitetural

A SoIZI não implementará um motor financeiro próprio. O domínio interno gerencia contrato comercial, estado e entitlements; o PSP gerencia cobrança.

### MVP

```text
SoIZI Commercial Domain
        ↓
BillingProvider interface
        ↓
AsaasBillingProvider
        ↓
Asaas Sandbox/Produção
        ↓
Saldo Asaas
        ↓
Transferência operacional para Cora
```

A Cora não recebe API credentials na aplicação durante o MVP.

---

## 2. Por que Asaas

A documentação oficial vigente em 25/08/2026 apresenta recursos diretamente adequados a SaaS:

- criação de assinaturas recorrentes;
- periodicidades múltiplas;
- cartão, boleto e fluxos Pix documentados;
- Checkout hospedado;
- Sandbox;
- Webhooks;
- idempotência de webhook por event ID;
- autenticação por API key;
- transferência para conta externa/Pix;
- recursos de conciliação;
- certificação PCI-DSS declarada pelo provider.

Fontes oficiais estão em `09_FONTES_OFICIAIS_E_POLITICA_DE_PESQUISA.md`.

---

## 3. Decisão de segurança para cartão

A documentação oficial do Asaas informa que, se dados de cartão passarem pelo backend da aplicação, o escopo PCI é significativamente maior; o Asaas também oferece Checkout hospedado.

### Política SoIZI

**Usar Checkout hospedado para cartão recorrente no fluxo padrão.**

Consequências:

- a SoIZI não coleta PAN/CVV;
- a SoIZI não armazena PAN/CVV;
- backend não recebe payload de cartão;
- frontend redireciona para URL oficial de checkout;
- pagamento é confirmado por webhook/consulta, não pela callback URL.

### Proibido no MVP

- formulário próprio de cartão;
- `creditCard` no DTO interno SoIZI;
- `creditCardHolderInfo` persistido por conveniência;
- guardar `creditCardToken` sem necessidade explícita do fluxo hospedado;
- logging de payload financeiro bruto.

---

## 4. Sandbox e produção

Configuração separada no registro global do banco:

```text
business.billing.environment
business.billing.asaas.sandbox_api_key
business.billing.asaas.production_api_key
business.billing.asaas.production_enabled
business.billing.asaas.webhook.*
business.billing.asaas.integration_enabled
business.billing.asaas.checkout_enabled
business.billing.asaas.webhook_processing_enabled
```

Chaves e tokens são cifrados antes de chegar ao PostgreSQL. O master de cifra
`SECRET_ENCRYPTION_KEY` fica no secret manager do runtime, separado do banco. A
URL base não é editável: `sandbox|production` deriva os hosts oficiais e cada
ambiente usa sua própria chave. O gate de Produção exige chave com prefixo
`$aact_prod_`, permissão explícita no registro global e `NODE_ENV=production`.
O Sandbox usa chave com prefixo `$aact_hmlg_`.

### Gate

Não permitir o ambiente `production` fora de runtime produtivo.

Controles de ativação de Asaas, checkout e processamento automático do webhook
também são globais no banco e começam desativados. Scripts de teste devem manter
essas definições desativadas no banco local.

---

## 5. Customer mapping

Cada `Organization` faturável deve mapear para um customer Asaas.

```text
Organization.id
    ↔
BillingCustomer.providerCustomerId
```

### Regras

- criar de forma idempotente;
- salvar ID retornado;
- usar `externalReference` interno quando suportado;
- não localizar customer por email como mecanismo primário depois do mapping;
- reconciliação deve detectar customer remoto ausente/inconsistente.

---

## 6. Checkout recorrente

### Fluxo

1. usuário com permission adequada escolhe uma oferta válida;
2. servidor resolve `BillingPrice` e `PlanVersion`;
3. verifica se organização pode iniciar checkout;
4. cria `BillingCheckoutAttempt` interno;
5. cria Checkout Asaas recorrente conforme documentação oficial atual;
6. salva provider checkout ID/link/status;
7. redireciona usuário;
8. callback de sucesso apenas exibe “processando/confirmando”; não concede acesso;
9. webhook/consulta atualiza assinatura e cobrança;
10. entitlement engine reflete estado final.

### Callback URLs

Devem:

- ser rotas da própria SoIZI;
- conter apenas IDs opacos/correlation state necessário;
- não transportar secrets;
- não declarar pagamento por conta própria.

---

## 7. Assinaturas sem cartão

Asaas documenta assinaturas e diferentes `billingType`. Entretanto páginas oficiais podem evoluir ou apresentar diferenças de disponibilidade/experiência em Pix.

### Política

- Boleto recorrente: implementar somente após teste Sandbox do endpoint vigente.
- Pix recorrente clássico/Pix Automático: feature flag OFF por padrão até validação da documentação vigente e homologação ponta a ponta.
- Não inferir que `billingType=PIX` produz a mesma UX do Pix Automático.
- Não habilitar método apenas porque um enum o aceita.

Registrar no diário quais páginas oficiais foram conciliadas.

---

## 8. Webhook

### 8.1 Endpoint

Exemplo de rota conceitual:

```text
POST /api/webhooks/asaas
```

Não misturar com rotas autenticadas por sessão do usuário.

### 8.2 Autenticação

Conforme docs Asaas:

- validar header `asaas-access-token`;
- token de 32–255 caracteres;
- token forte;
- token diferente da API key;
- token cifrado no banco e disponível somente no servidor.

O provisionamento usa os campos oficiais `name`, `url`, `email`, `enabled`,
`interrupted`, `apiVersion`, `authToken`, `sendType` e `events`. A aplicação
armazena o ID de webhook por ambiente e oferece criação/atualização pela API
Asaas. O destino salvo deve ser HTTPS público na rota `/api/webhooks/asaas`.
O conjunto de eventos é limitado aos eventos que o processador atual reconhece.

### 8.3 IP allowlist

Asaas recomenda IPs oficiais. Implementar somente se o runtime/proxy permitir determinar o IP real de origem de forma confiável conforme documentação oficial da plataforma de deploy.

Não confiar em `X-Forwarded-For` arbitrariamente.

### 8.4 At-least-once

Webhook pode repetir.

Requisito:

```text
providerEventId UNIQUE
```

Receber evento duplicado deve resultar em efeito interno equivalente a receber uma única vez.

### 8.5 Payload evolutivo

Parser deve:

- validar campos necessários;
- ignorar atributos desconhecidos;
- não falhar porque o Asaas adicionou campo novo;
- rejeitar shape inválido crítico;
- não logar secrets.

---

## 9. Durable inbox

Fluxo recomendado:

```text
Request
  ↓
validar auth token
  ↓
validar envelope mínimo
  ↓
INSERT BillingWebhookEvent ON UNIQUE providerEventId
  ↓
marcar PENDING
  ↓
retornar 2xx
  ↓
processador aplica evento
```

Se o executor pós-resposta não for durável, evento permanece no banco para reprocessamento.

Não apagar evento processado imediatamente.

---

## 10. Processamento de eventos

Criar handlers explícitos por família:

```text
subscription events
payment/charge events
checkout events
refund/chargeback events (quando suportados)
```

Cada handler:

- carrega mapping por provider ID/externalReference;
- valida organização esperada;
- aplica transição idempotente;
- salva charge/subscription;
- recalcula entitlement quando necessário;
- audita mudança relevante;
- atualiza webhook event como processed.

Evento desconhecido válido:

- registrar como `IGNORED_UNSUPPORTED` ou equivalente;
- retornar sucesso para evitar loop;
- alertar se representar risco funcional.

---

## 11. Reconciliação

### 11.1 Por que existe

Webhooks podem atrasar, duplicar e enfrentar falhas operacionais. O próprio provedor recomenda acompanhamento e permite consultas.

### 11.2 Reconcile service

```text
reconcileOrganizationBilling(organizationId)
reconcileSubscription(subscriptionId)
reconcilePendingWebhookEvents()
```

### 11.3 Regras

- leitura remota nunca apaga histórico local sem política;
- discrepância crítica gera audit/security event;
- possível reprocessar manualmente;
- ação administrativa de reconciliação requer permission;
- auto-reconciliation periódica deve seguir docs oficiais do scheduler/runtime escolhido.

---

## 12. Retentativas em chamadas de saída

Não aplicar retry cego em POST financeiro.

Antes de retry:

- verificar suporte oficial a idempotência daquele endpoint;
- usar external reference/idempotency key quando oficialmente suportado;
- se resposta for ambígua, consultar antes de criar novamente;
- registrar correlation ID.

A política é endpoint-specific.

---

## 13. Cancelamento

Não implementar sem consultar referência oficial de cancelamento/remoção de assinatura vigente.

Mapear separadamente:

- cancelamento imediato;
- cancelamento ao fim do período;
- exclusão/removal no provider;
- cobranças já geradas;
- cobranças pendentes;
- entitlement durante grace period.

A política comercial SoIZI deve ficar no domínio interno.

---

## 14. Refunds/estornos

Não fazem parte do primeiro incremento obrigatório.

Quando implementados:

- permission `platform.billing.refund`;
- privileged session;
- motivo;
- limite por operador;
- confirmação forte;
- idempotência;
- status reconciliation;
- audit log;
- teste Sandbox conforme documentação oficial do endpoint.

---

## 15. Taxas/custos

Taxas não fazem parte do código de negócio.

As páginas oficiais do Asaas informam taxas padrão e também deixam claro que condições podem variar por contrato/conta.

### Regras

- não hardcodar taxas do PSP;
- dashboard de margem usa configuração/finance data revisável;
- salvar snapshot de custo somente se houver fonte confiável;
- exibir “estimado” quando não for valor reconciliado;
- atualizar referências financeiras fora de release de código quando possível.

---

## 16. Cora no MVP

### 16.1 Papel

Conta de destino da tesouraria.

### 16.2 Fluxo

Recebimentos acumulam no Asaas conforme regras de liquidação do PSP. Financeiro transfere para Cora usando o canal operacional escolhido.

A SoIZI pode registrar, apenas para operação interna:

- data da última transferência informada;
- valor reconciliado manualmente;
- referência;

mas não deve fingir que isso é conciliação automática.

### 16.3 Futuro: transferência Asaas → Cora

A documentação Asaas disponibiliza transferência de saldo para conta externa/Pix. Se automatizada futuramente:

- Cora será destino allowlisted;
- destination data não editável por operador comum;
- mudança de destino exige Platform Owner + step-up + cooldown;
- limites;
- dupla aprovação;
- audit;
- alertas;
- kill switch.

### 16.4 Futuro: Cora API

A documentação oficial Cora descreve integração direta com certificado/chave e token, e modalidades de autorização OAuth.

Se usada:

- escolher modalidade contratada antes de codificar;
- usar Stage;
- mTLS/credentials conforme docs;
- `Idempotency-Key` quando exigido;
- secrets em secret manager/env server-side;
- começar read-only para extrato/reconciliação se houver necessidade.

---

## 17. Test matrix Asaas Sandbox

Antes de produção:

- criar customer;
- criar checkout recorrente;
- callback success/cancel/expired;
- cartão aprovado;
- cartão recusado;
- assinatura criada sem pagamento confirmado;
- payment received/confirmed conforme eventos vigentes;
- evento duplicado;
- evento fora de ordem quando aplicável;
- webhook com auth token inválido;
- webhook com campo adicional desconhecido;
- timeout/falha de processador;
- replay de evento;
- cancelamento;
- cobrança pendente;
- reconciliação manual;
- provider indisponível;
- API key inválida;
- ambiente trocado incorretamente.

Para Pix/boleto, adicionar matriz específica antes de habilitar cada método.

---

## 18. Fontes oficiais essenciais

- https://docs.asaas.com/docs/visao-geral
- https://docs.asaas.com/docs/assinaturas
- https://docs.asaas.com/reference/criar-nova-assinatura
- https://docs.asaas.com/docs/checkout-asaas
- https://docs.asaas.com/reference/criar-novo-checkout
- https://docs.asaas.com/docs/checkout-with-subscription-recurring
- https://docs.asaas.com/docs/sobre-os-webhooks
- https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook
- https://docs.asaas.com/docs/como-implementar-idempotencia-em-webhooks
- https://docs.asaas.com/docs/autentica%C3%A7%C3%A3o-1
- https://docs.asaas.com/docs/pci-dss
- https://docs.asaas.com/docs/pix-automatico
- https://docs.asaas.com/docs/transferencia-para-contas-de-outra-instituicao-pix-ted
- https://developers.cora.com.br/
- https://developers.cora.com.br/docs/utiliza%C3%A7%C3%A3o-das-apis
- https://developers.cora.com.br/docs/fluxos-de-autorizacao-e-autenticacao
