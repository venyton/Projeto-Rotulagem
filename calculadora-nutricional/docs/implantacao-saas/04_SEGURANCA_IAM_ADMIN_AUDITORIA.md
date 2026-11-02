# SoIZI Control Plane — Segurança, IAM Interno e Auditoria

## 1. Objetivo

Impedir que a criação de um painel global transforme um SaaS corretamente tenant-scoped em um sistema onde qualquer operador interno possua acesso irrestrito.

## 2. Princípios

1. least privilege;
2. deny by default;
3. autorização server-side em toda ação;
4. autenticação não é isolamento;
5. tenant isolation continua válido para serviços internos;
6. acesso global é explicitamente privilegiado;
7. privilégios críticos devem ser temporários quando possível;
8. auditoria faz parte do design, não é complemento;
9. segredos e dados financeiros não entram em logs;
10. suporte não equivale a impersonation irrestrita.

Referências: AWS SaaS Lens, OWASP Multi-Tenant Security, OWASP Authorization, Microsoft Entra PIM, GitHub roles, NIST SSDF.

---

## 3. Dois sistemas de autorização separados

### 3.1 Tenant IAM

Existente:

```text
OrganizationMember
→ Profile/Role
→ Permission/Grant
→ recurso da organização
```

### 3.2 Platform IAM

Novo:

```text
User
→ PlatformAdminAssignment
→ PlatformRole
→ PlatformPermission
→ ação do Control Plane
```

Não reutilizar `OrganizationRole=OWNER` para conceder administração global.

---

## 4. Break-glass

`INTERNAL_MASTER_EMAILS` deve evoluir para **break-glass/bootstrap**.

Regras recomendadas:

- pouquíssimas contas;
- 2FA obrigatório;
- alerta quando usado;
- acesso auditado;
- não usado em operações normais;
- revisão periódica;
- documentação de recuperação.

O Codex não deve remover o mecanismo antes do IAM interno estar funcional e testado.

---

## 5. Roles internas iniciais

### PLATFORM_OWNER

- gestão excepcional;
- atribuição de admins críticos;
- configuração de segurança;
- break-glass operational review.

Uso diário desencorajado.

### PLATFORM_ADMIN

- organizações;
- operações gerais;
- sem direito automático a conteúdo tenant sensível.

### CUSTOMER_ADMIN

- organizações;
- memberships;
- status;
- onboarding/offboarding operacional.

### BILLING_ADMIN

- assinatura;
- cobranças;
- reconciliação;
- grants comerciais dentro do limite;
- sem acesso técnico irrestrito.

### PRODUCT_ADMIN

- catálogo;
- planos;
- features;
- preços;
- publicação.

### SUPPORT_AGENT

- metadata diagnóstica;
- ações de suporte de baixo risco;
- sem alteração de plano/preço;
- sem conteúdo tenant por padrão.

### SECURITY_ADMIN

- operadores;
- sessões;
- 2FA reset;
- incidentes;
- access reviews.

### AUDITOR

- leitura de logs/auditoria;
- sem mutações.

### OPS_ADMIN

- health/reconciliation operacional;
- integrações e jobs conforme escopo.

---

## 6. Matriz de risco de permissions

Cada `PlatformPermission` recebe `riskLevel`.

### LOW

- leitura de métricas agregadas;
- leitura de catálogo público interno.

### MEDIUM

- editar metadata de organização;
- reprocessar evento não financeiro destrutivo.

### HIGH

- suspender usuário;
- alterar assinatura;
- criar commercial grant;
- resetar 2FA;
- revogar token.

### CRITICAL

- atribuir Platform Owner/Admin;
- excluir organização;
- refund acima de threshold;
- futura transferência financeira;
- mudar conta de tesouraria;
- acesso de suporte a conteúdo altamente sensível.

---

## 7. Privileged session

### 7.1 Quando exigir

Permissions HIGH/CRITICAL configuradas em policy.

### 7.2 Propriedades

- curta duração;
- MFA recente;
- justificativa;
- ticket opcional;
- propósito;
- expiração automática;
- revogação;
- correlation ID.

### 7.3 Step-up

Não basta verificar `session.user`.

Criar mecanismo server-side que prove:

- usuário possui platform role;
- MFA está habilitado;
- step-up aconteceu recentemente;
- privileged session ainda é válida;
- permission pedida está coberta.

Não armazenar código TOTP.

---

## 8. Approval workflow futuro

Para CRITICAL, permitir política de dois aprovadores ou maker/checker.

Entidade futura:

```text
PrivilegedActionRequest
- requestedBy
- permission
- target
- justification
- status
- expiresAt
- approvals
```

Não bloquear MVP se a equipe ainda é pequena, mas não impedir evolução.

---

## 9. Tenant data access

### 9.1 Regra padrão

Control Plane usa metadata operacional.

### 9.2 Acesso global a conteúdo

Somente por service explicitamente privilegiado e permission específica.

Nunca:

```ts
if (isInternalMaster) return prisma.generatedTable.findUnique({ id })
```

sem política, auditoria e necessidade.

### 9.3 Cross-tenant tests

Para cada novo repository/action tenant-scoped, teste:

- Tenant A acessa recurso A;
- Tenant A tenta recurso B de Tenant B → 404/403 conforme política;
- ID manipulado não troca tenant;
- platform operator sem permission global também não acessa.

---

## 10. Suporte

### MVP

Somente metadata + ferramentas de diagnóstico.

### Futuro

Support Access Session:

- operador solicita;
- motivo;
- escopo;
- duração;
- consentimento se política exigir;
- banner “Sessão de suporte SoIZI”;
- atos continuam atribuídos ao operador;
- log completo;
- encerramento imediato.

Não usar senha do cliente.

---

## 11. Reset de senha e 2FA

### Senha

Preferir disparar fluxo de recuperação ao invés de administrador escolher senha nova.

Se houver reset administrativo:

- não exibir senha atual;
- token one-time;
- audit;
- invalidar sessões conforme política.

### 2FA

Reset:

- HIGH risk;
- privileged session;
- motivo;
- usuário notificado;
- sessão/token antigo revogado quando aplicável;
- audit.

---

## 12. Auditoria

### 12.1 Evento

Estrutura mínima:

```text
id
timestamp
actorUserId
actorType
actorRole
permission
action
targetType
targetId
organizationId?
result
reason?
correlationId
requestMetadataSafe
beforeJsonSafe?
afterJsonSafe?
```

### 12.2 Não registrar

- API keys;
- webhook token;
- TOTP secret;
- senha;
- reset token;
- PAN/CVV;
- bearer tokens;
- cookies;
- documento técnico completo sem necessidade.

### 12.3 Proteção

- append-only pela camada de aplicação;
- nenhuma action de update/delete normal;
- leitura com permission própria;
- exportação auditada;
- retenção definida por política.

---

## 13. Segredos

Usar configuração server-side. Chaves e tokens do Asaas ficam cifrados no
registro global do banco; o master de cifra permanece fora do banco no secret
manager do runtime.

Salvar ou remover parâmetros Asaas e criar/atualizar seu webhook exige a
permission `platform.billing.configuration.manage` e uma sessão privilegiada
ativa com 2FA vinculada ao alvo `ASAAS_CONFIGURATION / GLOBAL`. As operações
registram essa sessão no log de auditoria.

Separar:

- chave de API Sandbox;
- chave de API Produção;
- token de webhook por ambiente;
- secrets de auth;
- TOTP encryption key;
- document HMAC secret;
- futuros secrets Cora.

Rotação deve ser documentada.

Não retornar secret em endpoint diagnóstico.

---

## 14. Rate limit

Aplicar rate limit específico a:

- login;
- step-up;
- admin search massivo;
- reset;
- checkout creation;
- webhook abuse (sem bloquear provider legítimo de forma frágil);
- reconciliation manual;
- token creation.

Considerar tenant + actor + operation conforme caso.

---

## 15. CSRF/same-origin

Manter guardrail atual para rotas mutáveis do browser.

Webhook externo não usa same-origin; usa autenticação própria do provider.

Não aplicar CSRF de sessão em webhook como substituto de auth token.

---

## 16. Secure SDLC

Seguir NIST SSDF e checks existentes.

Para cada etapa:

- threat model breve;
- dependency review;
- official docs;
- tests;
- lint/typecheck;
- security check;
- migration review;
- no secret in diff;
- code review de autorização.

---

## 17. Alertas recomendados

- uso de break-glass;
- novo Platform Owner;
- 2FA reset admin;
- múltiplas falhas de step-up;
- cross-tenant denial anormal;
- webhook auth inválido em volume;
- webhook queue parada;
- grant comercial alto;
- suspensão de organização;
- refund;
- mudança futura de destino financeiro.

---

## 18. Fontes oficiais

- https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/isolation-mindset.html
- https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html
- https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure
- https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-resource-roles-configure-role-settings
- https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/permissions-of-predefined-organization-roles
- https://slack.com/help/articles/360000394286-Audit-Logs-in-Slack
- https://csrc.nist.gov/pubs/sp/800/218/final
