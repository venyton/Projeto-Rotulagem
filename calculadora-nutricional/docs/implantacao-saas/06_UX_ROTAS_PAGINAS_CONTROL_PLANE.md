# SoIZI Control Plane — UX, Rotas e Páginas

## 1. Princípio de UX

O Control Plane é uma aplicação administrativa interna dentro do mesmo deploy/monólito modular, mas deve parecer e se comportar como um ambiente operacional distinto.

## 2. Entrada

Usuário comum:

```text
login → /dashboard
```

Usuário interno com acesso apenas ao Control Plane:

```text
login → /admin
```

Usuário com ambos:

```text
login → seletor de destino
          ├── SoIZI → /dashboard
          └── Administração → /admin
```

O seletor não concede authority. O servidor valida o destino.

---

## 3. Navegação recomendada

```text
Visão geral
Clientes
  Organizações
  Usuários
Comercial
  Planos
  Features
  Preços
  Cupons
  Cortesias/Grants
Billing
  Assinaturas
  Cobranças
  Reconciliação
  Webhooks
Produto
  Módulos
  Uso/Quotas
Segurança
  Operadores
  Sessões privilegiadas
  Eventos
  Auditoria
Operação
  Integrações
  Saúde
  Jobs/Reprocessamentos
```

Mostrar itens conforme permission; esconder no frontend não substitui autorização server-side.

---

## 4. `/admin`

Dashboard interno inicial.

Cards recomendados:

- organizações ativas;
- trials;
- assinaturas ativas;
- cobranças pendentes/atrasadas;
- MRR estimado/reconciliado;
- falhas de webhook;
- eventos pendentes de reconciliação;
- grants expirando;
- alertas de segurança;
- top tenants por uso.

Não buscar datasets gigantes no primeiro paint.

---

## 5. `/admin/organizations`

Tabela:

- nome;
- status;
- plano/version;
- billing status;
- seats;
- última atividade;
- flags de risco;
- ação de abrir detalhe.

Filtros:

- status;
- plano;
- billing;
- trial;
- grant;
- data;
- busca por nome/email administrativo/CNPJ mascarado quando aplicável.

Nunca retornar CPF/CNPJ completo se o modelo atual já evita armazená-lo em claro.

---

## 6. `/admin/organizations/[id]`

Tabs:

### Overview

- identidade;
- status;
- métricas;
- owner/admins;
- activity;
- health.

### Subscription

- plan/version;
- price;
- provider status;
- period;
- charges;
- checkout history;
- reconcile.

### Entitlements

- feature;
- effective value;
- source;
- validity;
- usage/limit.

### Members

- membros;
- role/profile;
- status;
- seats.

### Security

- 2FA coverage agregada;
- API tokens count;
- security events;
- suspensions.

### Audit

Eventos filtrados por organização.

### Support

Somente ferramentas permitidas; conteúdo do cliente não aparece por padrão.

---

## 7. Catálogo de planos

### Listagem

- plan key;
- nome;
- versão publicada;
- status;
- assinaturas por versão;
- preços ativos.

### Editor de draft

Features em matriz:

| Feature | Tipo | Valor/limite | Módulo |

Botões:

- salvar draft;
- comparar com versão publicada;
- validar;
- publicar.

Publish é ação HIGH/CRITICAL conforme política e exige confirmação forte.

---

## 8. Features

Tela permite:

- visualizar definição;
- criar feature nova;
- desativar para novos planos;
- ver quais planos usam;
- ver organizações com override.

Não permitir renomear `key` usada. Nome visual pode mudar.

---

## 9. Billing

### Assinaturas

- org;
- plan/version;
- status interno;
- status provider;
- current period;
- última sync;
- divergência.

### Charges

- org;
- provider charge ID mascarado/parcial se necessário;
- valor;
- status;
- due date;
- paid at;
- subscription.

### Reconciliation

- divergências;
- eventos pendentes;
- last error;
- ações reprocess/reconcile com permission.

### Webhooks

- provider event ID;
- type;
- received;
- processing status;
- attempts;
- error code;
- reprocess.

Payload bruto não precisa ficar visível; quando necessário, exibir versão sanitizada.

---

## 10. Coupons

Form:

- code;
- type;
- value;
- validity;
- max uses;
- plans;
- status.

Preview antes de ativar.

---

## 11. Grants

Criar grant exige:

- organização;
- motivo;
- features;
- limites;
- validade;
- confirmação.

UI deve destacar permanent grants em cor/ícone de risco, mas não depender de cor única para acessibilidade.

---

## 12. Operadores internos

Tabela:

- nome/email;
- roles;
- 2FA;
- status;
- último acesso admin;
- assignment expiry.

Ações de atribuir/remover role auditadas.

---

## 13. Sessão privilegiada

Quando ação requer step-up:

Modal/página:

```text
Esta ação exige acesso privilegiado.

Permissão: platform.entitlements.override
Destino: Organização ABC
Duração solicitada: 15 min
Justificativa: [................]
Código 2FA: [......]

[Ativar acesso]
```

Após ativação, mostrar indicador no header:

```text
Acesso privilegiado ativo • expira em 12 min
```

Nunca esconder que está ativo.

---

## 14. Audit UI

Filtros:

- actor;
- organization;
- action;
- resource;
- result;
- risk;
- date range;
- correlationId.

Detalhe mostra before/after sanitizados.

Exportação requer permission e gera audit event.

---

## 15. Customer billing UX (`/dashboard/settings` ou área própria)

Cliente autorizado pode:

- ver plano;
- ver limits/usage;
- iniciar upgrade;
- abrir checkout;
- ver histórico de cobranças permitido;
- cancelar conforme política;
- atualizar billing contact.

Não expor provider API IDs quando não forem úteis.

---

## 16. Erros e estados

Distinguir:

- provider unavailable;
- payment pending;
- reconciliation pending;
- permission denied;
- entitlement missing;
- organization suspended;
- checkout expired.

Nunca exibir stack trace/API secret/provider raw error ao cliente.

---

## 17. Acessibilidade e design system

Usar shadcn/Radix/tokens existentes.

- componentes atuais;
- dark/light;
- foco visível;
- labels;
- destructive confirmations;
- estados não dependentes apenas de cor;
- loading/empty/error states.

Não criar design system paralelo.
