# Protocolo determinístico de execução do Codex — Implantação SaaS SoIZI

**Data-base:** 25/08/2026  
**Status:** obrigatório para execução  
**Pasta de especificação:** `implantacao-saas/`  
**Pasta de acompanhamento:** `docs/implantacao-saas-execucao/`

---

# 1. Finalidade

Este documento define **como** o Codex deve executar o plano de implantação SaaS da SoIZI.

Os documentos existentes em `implantacao-saas/` dizem **o que deve ser construído** e quais regras arquiteturais devem ser respeitadas.

Este documento define **como o trabalho deve avançar entre as etapas**, como o progresso deve ser persistido no repositório, quando o Codex deve continuar automaticamente e quando deve interromper a execução.

O objetivo é eliminar ambiguidades como:

- "qual etapa devo fazer agora?";
- "quando uma etapa termina?";
- "posso começar a próxima?";
- "onde documento o que fiz?";
- "devo pedir autorização ao usuário?";
- "como retomo o trabalho em outra sessão?";
- "onde ficam decisões, fontes oficiais, testes e evidências?".

---

# 2. Duas pastas com responsabilidades diferentes

## 2.1 `implantacao-saas/`

É a **especificação normativa do projeto**.

Trate esta pasta como **read-only durante a implementação**, salvo se o usuário pedir explicitamente alteração da especificação.

Ela contém:

- arquitetura-alvo;
- regras de negócio;
- regras de segurança;
- billing;
- Asaas;
- Cora;
- planos;
- features;
- entitlements;
- UX;
- migrations;
- testes;
- rollout;
- política de documentação oficial.

Nunca use essa pasta como diário de desenvolvimento.

---

## 2.2 `docs/implantacao-saas-execucao/`

É a **trilha operacional da implementação real**.

Esta pasta deve ser criada pelo Codex antes de qualquer mudança de aplicação.

Estrutura obrigatória:

```text
docs/
└── implantacao-saas-execucao/
    ├── README.md
    ├── STATUS.md
    ├── FONTES_OFICIAIS.md
    ├── DECISOES.md
    ├── RISCOS_E_PENDENCIAS.md
    ├── CHANGELOG_IMPLEMENTACAO.md
    ├── etapas/
    │   ├── 00_BASELINE_E_PESQUISA.md
    │   ├── 01_RECONCILIACAO_BANCO.md
    │   ├── 02_IAM_E_CONTROL_PLANE.md
    │   ├── 03_CATALOGO_COMERCIAL.md
    │   ├── 04_ENTITLEMENTS_E_LIMITES.md
    │   ├── 05_ASAAS_SANDBOX_E_ADAPTER.md
    │   ├── 06_CHECKOUT_E_ASSINATURAS.md
    │   ├── 07_WEBHOOKS_E_RECONCILIACAO.md
    │   ├── 08_ADMINISTRACAO_CLIENTES.md
    │   ├── 09_CUPONS_GRANTS_OVERRIDES.md
    │   ├── 10_METRICAS_E_CONSUMO.md
    │   ├── 11_PRIVILEGIOS_E_SUPORTE.md
    │   └── 12_HARDENING_E_ROLLOUT.md
    └── evidencias/
        ├── etapa-00/
        ├── etapa-01/
        ├── etapa-02/
        ├── etapa-03/
        ├── etapa-04/
        ├── etapa-05/
        ├── etapa-06/
        ├── etapa-07/
        ├── etapa-08/
        ├── etapa-09/
        ├── etapa-10/
        ├── etapa-11/
        └── etapa-12/
```

Não criar arquivos de documentação espalhados aleatoriamente pelo repositório para este projeto.

---

# 3. `STATUS.md` é a máquina de estados oficial

O arquivo:

`docs/implantacao-saas-execucao/STATUS.md`

é a **única fonte de verdade do progresso da implantação**.

Antes de iniciar qualquer trabalho, o Codex deve lê-lo.

Se não existir, significa que a implantação ainda não começou. Nesse caso:

1. criar a estrutura de acompanhamento;
2. criar `STATUS.md`;
3. definir `Etapa atual: 00`;
4. definir `Estado: READY`;
5. iniciar a Etapa 00.

Formato obrigatório:

```md
# Status da implantação SaaS

Última atualização: YYYY-MM-DD HH:mm
Branch: <branch>
Commit base: <commit>

## Etapa atual

Etapa: 00
Nome: Baseline e pesquisa
Estado: IN_PROGRESS

## Última etapa concluída

Nenhuma.

## Próxima etapa

Etapa 01 — Reconciliação segura do banco

## Gates

| Etapa | Estado |
| --- | --- |
| 00 | IN_PROGRESS |
| 01 | BLOCKED_BY_PREVIOUS |
| 02 | BLOCKED_BY_PREVIOUS |
| ... | ... |

## Bloqueios atuais

Nenhum.

## Decisões humanas pendentes

Nenhuma.

## Próxima ação objetiva

<uma única ação clara que deve ser executada ao retomar>
```

Estados permitidos:

- `READY`
- `IN_PROGRESS`
- `BLOCKED`
- `GATE_FAILED`
- `DONE`
- `BLOCKED_BY_PREVIOUS`

Não inventar outros estados sem documentar a necessidade.

---

# 4. Algoritmo obrigatório ao iniciar ou retomar o trabalho

Sempre que uma sessão nova do Codex começar:

## Passo A — Ler especificação

Ler:

1. `implantacao-saas/00_LEIA_PRIMEIRO_ORDEM_DE_EXECUCAO.md`;
2. `implantacao-saas/01_PLANO_MESTRE_CONTROL_PLANE_SOIZI.md`;
3. este protocolo;
4. os documentos auxiliares necessários para a etapa atual.

Não é necessário reler cegamente cada palavra de todos os auxiliares a cada retomada, mas é obrigatório reler os documentos que governam a etapa atual e verificar se foram modificados.

## Passo B — Ler estado real

Ler:

`docs/implantacao-saas-execucao/STATUS.md`

e determinar:

- etapa atual;
- estado atual;
- último gate;
- bloqueios;
- próxima ação objetiva.

## Passo C — Conferir o repositório

Verificar:

- branch;
- commit atual;
- working tree;
- mudanças não commitadas;
- migrations existentes;
- arquivos já alterados pela etapa.

Nunca assumir que o estado do repositório é igual ao da sessão anterior.

## Passo D — Retomar exatamente do ponto registrado

Não voltar arbitrariamente para a Etapa 00.

Não pular para outra etapa porque parece mais interessante.

Não começar tela de administração se o `STATUS.md` disser que a Etapa 03 está em andamento.

---

# 5. Ordem fixa das etapas

A ordem oficial é:

1. Etapa 00 — Baseline e pesquisa
2. Etapa 01 — Reconciliação segura do histórico de billing/migrations
3. Etapa 02 — IAM interno e fundação do Control Plane
4. Etapa 03 — Catálogo comercial
5. Etapa 04 — Entitlements e limites
6. Etapa 05 — Abstração de billing + Asaas Sandbox
7. Etapa 06 — Checkout, assinatura e ciclo de cobrança
8. Etapa 07 — Webhooks, idempotência e reconciliação
9. Etapa 08 — Administração de organizações/clientes
10. Etapa 09 — Cupons, descontos, cortesias e overrides
11. Etapa 10 — Métricas SaaS, consumo e saúde por tenant
12. Etapa 11 — Segurança privilegiada e suporte controlado
13. Etapa 12 — Hardening, E2E, homologação e rollout

A próxima etapa somente fica `READY` quando a anterior estiver `DONE`.

---

# 6. Como iniciar uma etapa

Ao iniciar uma etapa:

1. atualizar `STATUS.md`;
2. alterar a etapa para `IN_PROGRESS`;
3. atualizar data, branch e commit;
4. abrir/criar o arquivo correspondente em `docs/implantacao-saas-execucao/etapas/`;
5. registrar o estado inicial;
6. registrar as fontes oficiais que precisam ser consultadas;
7. criar checklist concreto de entregáveis;
8. somente depois alterar código.

Exemplo:

```md
# Etapa 05 — Asaas Sandbox e Adapter

## Estado
IN_PROGRESS

## Objetivo
Construir a abstração interna de billing e integração Sandbox inicial com Asaas.

## Estado encontrado antes da etapa
...

## Documentação oficial obrigatória
- Asaas Authentication
- Asaas Customers
- Asaas Sandbox
- Asaas Webhooks, se necessário nesta etapa
- documentação oficial da biblioteca HTTP escolhida, quando relevante

## Checklist
- [ ] definir interface interna do provider
- [ ] configurar envs de sandbox
- [ ] criar adapter server-only
- [ ] implementar customer mapping
- [ ] implementar consulta segura
- [ ] adicionar testes
- [ ] executar gate
```

Checklist não substitui critérios de aceite da especificação.

---

# 7. Regra de documentação oficial por etapa

Antes de implementar comportamento dependente de fornecedor ou tecnologia externa:

1. localizar documentação oficial vigente;
2. registrar em `FONTES_OFICIAIS.md`;
3. registrar também no documento da etapa;
4. incluir data da consulta;
5. incluir versão/API version quando houver;
6. indicar qual decisão aquela fonte sustenta.

Formato recomendado:

```md
## Asaas — criação de cliente

Fonte oficial: <URL>
Consultado em: 2026-08-25
Versão/API: <quando aplicável>

Uso nesta implementação:
- endpoint utilizado;
- campos necessários;
- idempotência suportada ou não;
- erros relevantes;
- comportamento de sandbox.

Arquivos impactados:
- ...
```

Fonte secundária nunca substitui documentação oficial existente.

---

# 8. Regra para decisões arquiteturais

Toda decisão relevante deve ser registrada em:

`docs/implantacao-saas-execucao/DECISOES.md`

Use IDs sequenciais:

- `DEC-001`
- `DEC-002`
- `DEC-003`

Formato:

```md
## DEC-001 — Título

Data:
Etapa:
Status: ACEITA

### Contexto

### Opções avaliadas

### Decisão

### Base oficial

### Consequências

### Possível reversão futura
```

Não registrar pensamentos internos do agente.

Registrar apenas decisão técnica verificável e justificativa.

---

# 9. Como uma etapa termina

Uma etapa NÃO termina quando "o código parece pronto".

Ela só termina quando os cinco blocos abaixo forem concluídos:

## Bloco 1 — Implementação

Todos os entregáveis da etapa foram implementados.

## Bloco 2 — Documentação

O arquivo da etapa contém:

- estado inicial;
- fontes oficiais;
- decisões;
- arquivos alterados;
- migrations;
- riscos;
- pendências;
- resultado final.

## Bloco 3 — Testes

Executar tudo que for aplicável:

- testes unitários;
- integração;
- segurança;
- cross-tenant;
- lint;
- typecheck;
- Prisma validate;
- checks arquiteturais;
- build;
- testes de contrato/Sandbox quando necessários.

## Bloco 4 — Evidências

Registrar comandos e resultados relevantes.

Não é obrigatório salvar megabytes de logs.

Salvar evidências suficientes para provar o gate.

## Bloco 5 — Gate

Avaliar explicitamente o gate da etapa.

Resultado obrigatório:

`GATE: APROVADO`

ou

`GATE: REPROVADO`

---

# 10. Transição automática entre etapas

Esta é uma regra obrigatória.

## Se o gate for APROVADO

O Codex deve, nesta ordem:

1. marcar a etapa atual como `DONE`;
2. registrar a conclusão no arquivo da etapa;
3. adicionar entrada no `CHANGELOG_IMPLEMENTACAO.md`;
4. atualizar `RISCOS_E_PENDENCIAS.md`;
5. atualizar `STATUS.md`;
6. marcar a próxima etapa como `READY`;
7. definir a próxima etapa como `Etapa atual`;
8. registrar `Próxima ação objetiva`;
9. iniciar automaticamente a próxima etapa.

**Não pedir autorização humana apenas porque uma etapa terminou.**

A conclusão de uma etapa normal é autorização para iniciar a seguinte.

---

## Se o gate for REPROVADO

1. marcar etapa como `GATE_FAILED`;
2. não iniciar a próxima;
3. documentar exatamente o motivo;
4. corrigir dentro da mesma etapa quando possível;
5. repetir os testes;
6. reavaliar o gate.

Não esconder ou ignorar teste quebrado.

---

# 11. Quando o Codex DEVE parar e pedir decisão humana

Mesmo que haja próxima etapa, interromper a execução se ocorrer um dos casos abaixo:

## 11.1 Operação potencialmente destrutiva em ambiente real

Exemplos:

- drop;
- rename destrutivo;
- backfill irreversível;
- exclusão de dados;
- alteração de produção;
- migration remota com risco relevante.

## 11.2 Necessidade de credencial real

Exemplos:

- `ASAAS_API_KEY` de produção;
- credencial Cora;
- segredo de OAuth real;
- chave bancária.

Nunca pedir que segredo seja colado em documentação ou commit.

## 11.3 Produção financeira

Qualquer ação que:

- crie cobrança real;
- movimente dinheiro real;
- faça refund real;
- transfira saldo;
- altere conta bancária real.

## 11.4 Divergência oficial não resolvida

Quando duas fontes oficiais relevantes entram em conflito e Sandbox/teste não resolve de forma segura.

## 11.5 Decisão comercial

Exemplos:

- preço real dos planos;
- percentual de desconto comercial definitivo;
- política de inadimplência;
- duração de trial;
- política de grandfathering não definida.

## 11.6 Mudança de arquitetura fora do plano

Quando for necessário quebrar uma invariante documentada.

Nesses casos:

1. marcar `STATUS.md` como `BLOCKED`;
2. registrar questão em `RISCOS_E_PENDENCIAS.md`;
3. explicar alternativas de forma objetiva;
4. parar.

---

# 12. Quando o Codex NÃO deve parar

Não pedir confirmação humana apenas para:

- criar arquivo interno;
- adicionar teste;
- refatorar dentro do escopo aprovado;
- prosseguir para etapa seguinte após gate verde;
- consultar documentação oficial;
- criar migration local aditiva prevista no plano;
- executar teste em Sandbox;
- corrigir falha encontrada na própria etapa;
- atualizar documentação de acompanhamento.

O plano já constitui autorização para essas ações dentro dos limites definidos.

---

# 13. Regras específicas para migrations

Antes da primeira migration da Etapa 01:

1. inventariar schema atual;
2. inventariar migrations históricas;
3. verificar estruturas históricas de billing;
4. verificar banco local representativo;
5. documentar divergência.

Para cada migration:

- finalidade;
- tabelas/colunas;
- compatibilidade;
- backfill;
- risco;
- rollback;
- teste de upgrade;
- teste em banco representativo.

Nunca usar `prisma db push` para "resolver" produção.

---

# 14. Regras específicas para Asaas

As fases financeiras devem ocorrer nesta sequência:

1. pesquisa oficial;
2. Sandbox;
3. adapter interno;
4. customer mapping;
5. checkout;
6. subscription;
7. webhooks;
8. idempotência;
9. reconciliação;
10. testes de falha;
11. somente depois considerar produção.

Redirect de checkout nunca é prova suficiente de pagamento.

O estado financeiro autoritativo deve ser confirmado pelo mecanismo oficial do provider, conforme documentação vigente.

Dados completos de cartão e CVV não devem ser persistidos pela SoIZI.

---

# 15. Regras específicas para Cora

Nesta iniciativa:

- Cora é tesouraria/conta bancária de destino;
- não é o motor principal de billing do MVP;
- não adicionar credenciais Cora apenas para "deixar preparado";
- não automatizar transferências no MVP;
- integração futura deve possuir etapa própria, documentação oficial, autenticação oficial e gate financeiro humano.

---

# 16. Regras de segurança entre etapas

Nenhuma etapa pode reduzir as invariantes existentes de:

- autenticação;
- autorização server-side;
- isolamento por `organizationId`;
- 2FA;
- CSP;
- same-origin;
- rate limit;
- secret management;
- API token hashing;
- audit log;
- domínio server-authoritative.

Ao alterar autorização, adicionar testes negativos.

Ao criar entidade tenant-scoped, adicionar teste cross-tenant.

Ao criar ação administrativa, adicionar teste de privilege escalation.

Ao criar webhook, adicionar teste de duplicidade.

---

# 17. Formato de `README.md` da execução

`docs/implantacao-saas-execucao/README.md` deve explicar:

- finalidade da pasta;
- diferença entre especificação e execução;
- como consultar `STATUS.md`;
- ordem das etapas;
- onde estão decisões;
- onde estão fontes oficiais;
- onde estão riscos;
- como retomar o desenvolvimento.

Este README é voltado a humanos e novos agentes.

---

# 18. Formato de `CHANGELOG_IMPLEMENTACAO.md`

Registrar somente mudanças efetivamente realizadas.

Exemplo:

```md
## 2026-08-25 — Etapa 02 concluída

- criado guard server-side do Control Plane;
- introduzidas roles administrativas internas;
- criado shell `/admin`;
- adicionados testes de acesso não autorizado;
- `INTERNAL_MASTER_EMAILS` mantido como bootstrap/break-glass;
- gate da Etapa 02 aprovado.
```

Não usar changelog para planos futuros.

---

# 19. Formato de `RISCOS_E_PENDENCIAS.md`

Cada item:

```md
## RISK-001 — título

Etapa:
Severidade: CRITICAL | HIGH | MEDIUM | LOW
Status: OPEN | MITIGATED | ACCEPTED | CLOSED

Descrição:

Impacto:

Mitigação:

Responsável/decisão necessária:

Prazo ou etapa alvo:
```

---

# 20. Etapa 00 — Baseline e pesquisa

O Codex deve:

1. criar toda a pasta de execução;
2. registrar branch e commit;
3. mapear schema;
4. mapear migrations;
5. mapear tenant isolation;
6. mapear `OrganizationEntitlement`;
7. mapear permissions/profiles/grants;
8. mapear `INTERNAL_MASTER_EMAILS`;
9. mapear rotas de dashboard;
10. mapear APIs;
11. mapear security checks;
12. mapear CI;
13. mapear variáveis de ambiente relevantes;
14. identificar billing/marketing histórico;
15. registrar documentação oficial necessária;
16. produzir baseline final;
17. avaliar gate.

Proibição:

**nenhuma migration do SaaS novo antes do Gate 00 aprovado.**

---

# 21. Etapa 01 — Reconciliação de banco

Objetivo:

resolver ou planejar de forma segura a divergência entre estruturas históricas de billing e o schema atual.

Entregáveis:

- inventário histórico;
- estratégia aditiva;
- migrations necessárias;
- testes de migration;
- validação em banco representativo;
- rollback;
- ausência de perda silenciosa.

Não iniciar IAM novo enquanto a base necessária estiver inconsistente.

---

# 22. Etapa 02 — IAM interno e Control Plane

Objetivo:

criar a fundação de autoridade interna e shell `/admin`.

Entregáveis mínimos:

- roles internas;
- permissions internas;
- guard server-side;
- layout separado;
- navegação inicial;
- auditoria de acesso;
- testes negativos;
- estratégia `INTERNAL_MASTER_EMAILS`.

Gate deve provar que usuário comum não acessa `/admin`, inclusive chamando endpoints diretamente.

---

# 23. Etapa 03 — Catálogo comercial

Objetivo:

representar comercialmente o produto sem acoplar código a nomes de plano.

Entregáveis:

- FeatureDefinition;
- Plan;
- PlanVersion;
- Price;
- relacionamento feature/plano;
- estados de draft/published/archived conforme especificação;
- imutabilidade de versão publicada;
- UI administrativa inicial;
- testes.

---

# 24. Etapa 04 — Entitlements e limites

Objetivo:

resolver centralmente o que uma organização pode utilizar.

Entregáveis:

- resolvedor central;
- precedência;
- limits/seats/quotas;
- compatibilidade com mecanismos atuais;
- overrides;
- testes de bypass;
- testes de precedência.

Nenhum módulo deve passar a verificar diretamente `plan === X`.

---

# 25. Etapa 05 — Asaas Sandbox e adapter

Objetivo:

integrar o domínio interno ao Asaas sem acoplamento direto do restante da aplicação.

Entregáveis:

- documentação oficial registrada;
- envs Sandbox;
- interface interna;
- adapter server-only;
- customer mapping;
- health/diagnostic sem segredos;
- testes de contrato em Sandbox;
- tratamento seguro de erros.

---

# 26. Etapa 06 — Checkout e assinaturas

Objetivo:

criar o ciclo inicial de contratação.

Entregáveis:

- checkout oficial;
- customer mapping;
- subscription interna;
- charges internas;
- external references;
- retorno do checkout tratado como UX e não como verdade financeira;
- testes de sucesso/falha/cancelamento.

---

# 27. Etapa 07 — Webhooks e reconciliação

Objetivo:

tornar o estado financeiro robusto.

Entregáveis:

- autenticação/verificação conforme Asaas;
- inbox;
- deduplicação;
- idempotência;
- processamento repetível;
- reprocessamento;
- reconciliação;
- eventos fora de ordem;
- logs;
- testes.

O gate deve incluir evento duplicado e falha intermediária.

---

# 28. Etapa 08 — Administração de clientes

Objetivo:

permitir que operadores autorizados da SoIZI administrem organizações sem acessar conteúdo desnecessário.

Entregáveis:

- lista/detalhe da organização;
- assinatura;
- membros;
- seats;
- status;
- entitlements;
- billing summary;
- ações administrativas autorizadas;
- auditoria;
- proteção contra acesso ao conteúdo do cliente sem necessidade.

---

# 29. Etapa 09 — Cupons, grants e overrides

Objetivo:

tratar exceções comerciais sem corromper o catálogo.

Entregáveis:

- coupon/promotion;
- redemption;
- commercial grant;
- expiração;
- reason;
- createdBy;
- auditoria;
- step-up para ações críticas quando definido;
- testes.

---

# 30. Etapa 10 — Métricas e consumo

Objetivo:

criar visibilidade SaaS por tenant e global.

Entregáveis:

- consumo por tenant;
- seats;
- quotas;
- billing metrics reconciliadas;
- atividade;
- custos/uso quando aplicável;
- dashboards administrativos;
- evitar métricas derivadas de dados não confiáveis do browser.

---

# 31. Etapa 11 — Privilégios e suporte

Objetivo:

endurecer a operação administrativa.

Entregáveis conforme necessidade e escopo final:

- privileged sessions;
- step-up;
- justificativa;
- expiração;
- approval workflow quando aplicável;
- suporte controlado;
- auditoria reforçada;
- testes de privilege escalation.

---

# 32. Etapa 12 — Hardening e rollout

Objetivo:

provar que o sistema está pronto para implantação gradual.

Entregáveis:

- E2E;
- Sandbox financeiro completo;
- testes cross-tenant;
- testes de autorização;
- backup;
- migration dry-run;
- feature flags;
- piloto;
- plano de rollback;
- observabilidade;
- critérios de go/no-go.

Produção financeira exige gate humano explícito.

---

# 33. Resposta do Codex ao usuário ao longo do trabalho

Ao concluir cada etapa, o Codex deve informar de forma curta:

1. etapa concluída;
2. gate;
3. principais entregas;
4. testes;
5. documentação criada;
6. próxima etapa que será iniciada.

Não despejar logs gigantes na conversa.

A documentação detalhada permanece em `docs/implantacao-saas-execucao/`.

---

# 34. Regra final

A execução deve funcionar como uma máquina de estados:

```text
READY
  ↓
IN_PROGRESS
  ↓
GATE
  ├── aprovado → DONE → próxima etapa READY → IN_PROGRESS
  └── reprovado → GATE_FAILED → corrigir → repetir GATE
```

Somente:

```text
BLOCKED
```

exige interrupção por decisão externa.

**Não existe estado implícito.**

Se não estiver documentado no `STATUS.md`, não é o estado oficial da implantação.
