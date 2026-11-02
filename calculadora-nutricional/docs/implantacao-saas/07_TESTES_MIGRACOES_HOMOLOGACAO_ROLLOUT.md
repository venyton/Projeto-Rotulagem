# SoIZI Control Plane — Testes, Migrations, Homologação e Rollout

## 1. Objetivo

Garantir que a implementação do Control Plane e billing possa ser introduzida sem corromper dados, quebrar tenant isolation ou criar cobrança indevida.

---

## 2. Estratégia geral

Cada etapa passa por:

```text
Docs oficiais
→ design
→ migration/code
→ unit tests
→ integration tests
→ security tests
→ build/check
→ evidência no diário
→ gate
```

Financeiro adiciona:

```text
Sandbox contract tests
→ webhook replay
→ reconciliation
→ human approval
```

---

## 3. Etapa 0: banco e migrations históricas

Executar em ambiente local isolado:

- `prisma migrate status` conforme versão oficial Prisma;
- inspecionar `schema.prisma`;
- inventariar migration histórica de billing/marketing;
- listar tabelas/enums atuais no PostgreSQL;
- confirmar diferenças;
- produzir relatório.

Não executar cleanup automático.

---

## 4. Migration policy

### Permitido

- migrations aditivas;
- colunas nullable primeiro;
- backfill controlado;
- índices concorrentes quando suportados e planejados conforme PostgreSQL/Prisma;
- constraints após dados válidos.

### Proibido sem release específico

- drop de tabela histórica;
- rename destrutivo;
- alterar tipo com perda;
- recriar schema do zero;
- `db push` no remoto para “sincronizar”.

---

## 5. Teste de upgrade

Criar banco representativo com:

- migrations históricas;
- dados de organização;
- memberships;
- entitlements;
- tabelas nutricionais;
- objetos históricos de billing presentes se existirem.

Aplicar novas migrations e validar:

- contagem de registros;
- FKs;
- login;
- tenant context;
- geração de tabela;
- exportação;
- `/admin` guard;
- billing tables.

---

## 6. Unit tests

Cobrir:

- entitlement resolver;
- feature limits;
- plan version immutability;
- price money conversions;
- coupon validity;
- grant precedence;
- privileged session expiry;
- permission matrix;
- provider event mapping;
- webhook dedupe;
- subscription state machine.

---

## 7. Integration tests DB

Com banco isolado:

- organization A/B;
- cross-tenant read/write;
- simultaneous seat allocation;
- duplicate coupon redemption;
- webhook duplicate concurrently;
- reconciling provider IDs;
- audit append.

---

## 8. E2E

Fluxos mínimos:

### Cliente

- cadastro/login;
- selecionar workspace;
- criar tabela (regression);
- ver plano;
- iniciar checkout;
- retornar de checkout sem conceder acesso antes do webhook;
- entitlement muda após estado confirmado.

### Admin

- usuário sem role recebe 403/redirect seguro;
- operador entra `/admin`;
- lista orgs;
- abre detalhe;
- role restrita não vê billing/security indevido;
- step-up em ação high risk;
- audit event gerado.

---

## 9. Asaas Sandbox contract tests

Usar somente credencial Sandbox.

Registrar IDs de teste no log de teste, nunca em código fixo.

Cenários:

1. customer create/retrieve;
2. checkout create;
3. checkout recurring credit card;
4. success callback;
5. cancel callback;
6. expired callback;
7. subscription create event;
8. payment created;
9. payment confirmed/received conforme docs atuais;
10. declined card;
11. duplicate webhook;
12. invalid webhook token;
13. extra unknown JSON property;
14. retry/replay;
15. subscription lookup;
16. list subscription charges;
17. cancel behavior;
18. reconciliation mismatch.

Métodos adicionais só ganham produção depois de teste dedicado.

---

## 10. Webhook replay tests

Armazenar fixtures sanitizadas geradas a partir de payloads Sandbox reais.

Testar:

- mesmo event ID 10x;
- concorrência;
- event unknown;
- partial failure depois do insert;
- restart do processador;
- payload maior/invalid;
- token errado.

Resultado: efeito financeiro interno deve ser determinístico.

---

## 11. Security tests

- IDOR/cross-tenant;
- admin route bypass;
- role escalation;
- forged `organizationId`;
- forged plan/price ID;
- webhook token timing-safe comparison quando aplicável;
- secret leakage logs;
- open redirect em callback;
- CSRF em admin mutations;
- rate limit;
- session expiry;
- privileged session bypass;
- audit tampering via app.

---

## 12. CI

Manter checks atuais e incluir progressivamente:

- tests novos;
- migration schema validation;
- dependency/security scan existente;
- architecture guard para impedir client import de billing provider;
- guard para impedir `ASAAS_API_KEY` em client bundle;
- guard para routes `/admin` sem auth wrapper quando viável;
- fixtures sem secrets.

---

## 13. Feature flags

Introduzir flags server-side para rollout:

```text
CONTROL_PLANE_ENABLED
CUSTOMER_PLAN_UI_ENABLED
PIX_AUTOMATICO_ENABLED=false
TREASURY_AUTOMATION_ENABLED=false
```

As flags `BILLING_ASAAS_ENABLED`, `BILLING_CHECKOUT_ENABLED` e
`BILLING_WEBHOOK_PROCESSING_ENABLED` são valores do registro global no banco;
testes locais devem deixá-los desativados no banco, sem injetar variáveis de
ambiente para ativar/desativar billing.

Não usar flag client-side para security authorization.

---

## 14. Rollout

### Fase A — dark launch

- schema + serviços;
- UI admin só internos;
- sem billing produção.

### Fase B — Asaas Sandbox completo

- equipe interna;
- fixtures;
- reconciliação.

### Fase C — produção sem self-service

- 1 organização piloto;
- contratação iniciada por admin;
- monitoramento intensivo.

### Fase D — self-service limitado

- grupo piloto;
- checkout.

### Fase E — geral

- métricas;
- alertas;
- runbook.

---

## 15. Gate de produção financeira

Somente liberar quando todos forem SIM:

- [ ] API key produção armazenada corretamente
- [ ] webhook token produção configurado
- [ ] endpoint HTTPS
- [ ] webhook idempotente
- [ ] duplicate replay test passa
- [ ] reconciliation funciona
- [ ] rollback de entitlement funciona
- [ ] checkout não concede acesso sozinho
- [ ] audit funciona
- [ ] alertas mínimos existem
- [ ] backup feito
- [ ] migrations dry-run executadas
- [ ] E2E passou
- [ ] nenhum dado de cartão passa pelo SoIZI
- [ ] documentação oficial revisada na data de go-live
- [ ] responsável humano aprovou

---

## 16. Rollback

### Código

Feature flags permitem desligar:

- novos checkouts;
- processamento automático;
- UI comercial.

### Dados

Não fazer rollback destrutivo de migration já aplicada. Preferir migration forward-fix.

### Financeiro

Se integration estiver instável:

- parar novos checkouts;
- manter recebimento de webhook;
- persistir eventos;
- reconciliar manualmente;
- não excluir subscriptions remotas automaticamente.

---

## 17. Runbooks necessários antes do lançamento

- API key Asaas comprometida;
- webhook queue interrompida;
- provider fora do ar;
- evento duplicado;
- cobrança recebida sem subscription local;
- entitlement incorreto;
- organização indevidamente suspensa;
- operador interno comprometido;
- rollback de release;
- restore de banco;
- reconciliação financeira.
