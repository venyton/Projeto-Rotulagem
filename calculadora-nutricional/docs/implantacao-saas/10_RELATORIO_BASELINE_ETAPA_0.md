# SoIZI Control Plane — Relatório de Baseline da Etapa 0

**Data:** 25/08/2026

**Checkout:** `/home/paz/projetos/Projeto-Rotulagem-security-regras-negocio`

**Branch:** `feat/padronizacao-interface-e-governanca`

**HEAD:** `de730f82bae1b0c225f5863b8d7c663a8e09abdd`

**Escopo:** leitura, inventário, análise de conflitos, fontes oficiais e validação do gate; sem implementação funcional

## 1. Veredito

**Etapa 0: APROVADA no escopo documental e diagnóstico.**

O gate fica **VERDE somente para iniciar a Etapa 1 — Reconciliação de Banco**. Não está autorizada a criação de migrations funcionais, o início do billing, a construção de `/admin` nem qualquer operação no Neon. A arquitetura alvo é compatível com a direção do produto, mas o runtime atual e, sobretudo, a história de migrations exigem reconciliação antes de qualquer expansão segura.

Este veredito não equivale a auditoria completa ou certificação de segurança do produto e não valida produção.

## 2. Escopo e método

Foram lidos integralmente, na ordem canônica, os documentos `00` a `09` deste diretório, seguidos pela arquitetura atual, schema Prisma, 20 migrations SQL, autenticação/autorização, módulos, organizações, CI, checks de segurança, testes e operação local.

O worktree, a branch, o HEAD e as mudanças preexistentes foram confirmados antes de qualquer alteração. Foram preservados o `AGENTS.md` novo na raiz, a remoção preexistente do `calculadora-nutricional/AGENTS.md` e todo o pacote ainda não rastreado `docs/implantacao-saas/`.

## 3. Inventário factual

| Área | Estado atual verificável |
| --- | --- |
| Runtime | Next.js 16.2.12; React 19.2.3; NextAuth 4.24.15; Prisma 5.22.0; TypeScript 5.9.3 |
| Domínios | 13 diretórios em `src/features` |
| Superfícies HTTP | 13 Route Handlers e 9 módulos de Server Actions |
| Testes | 18 arquivos; gate atual executa 56 testes unitários; sem suíte de integração PostgreSQL/Control Plane ou E2E de `/admin` |
| Prisma atual | 26 models e 11 enums |
| Migrations versionadas | 20 diretórios, de `20260513200000` a `20260824130000` |
| Control Plane | Ausente: não há rota `/admin`, IAM interno, sessão privilegiada ou permissões de plataforma |
| Billing alvo | Ausente: não há adapter Asaas/Cora nem models atuais do novo catálogo/billing |
| Billing histórico | Presente em SQL de 15/05/2026 com Stripe/Manual, mas omitido do schema Prisma atual |
| Entitlements | Por `SaaSModuleKey`, com fonte textual e limite opcional; não existe catálogo granular `FeatureDefinition` |
| Auditoria | Log básico por organização/usuário/ação/risco; contrato insuficiente para ações privilegiadas e financeiras |
| Administração global | Permitida por allowlist de e-mail e executada dentro de `/dashboard/settings`; os stubs `/dashboard/master/*` apenas redirecionam ao dashboard |

### Mapa de módulos atuais

O domínio SaaS reconhece nove chaves: autenticação, tabelas nutricionais, fichas técnicas, ingredientes, Open Food Facts, enterprise, i18n, API e configurações. O acesso combina entitlement da organização, papel/membership e grants de perfil/participante.

Não existe ainda a separação conceitual completa entre:

1. Application Plane;
2. Customer Admin Plane;
3. Commercial Control Plane;
4. Platform Control Plane.

Na prática, parte do Platform Control Plane está misturada ao Customer Admin Plane por meio de ações globais em configurações.

### Mapa de autorização atual

1. NextAuth autentica e produz sessão JWT.
2. O contexto ativo deriva membership e organização no servidor.
3. O entitlement por módulo é consultado antes das permissões do membro/perfil.
4. OWNER/ADMIN recebem grants padrão; perfis e grants individuais refinam acesso.
5. APIs por token validam hash, organização, membership e entitlement.
6. A identidade master usa allowlist de e-mail e resolução de usuário no banco para operações globais.

O principal conflito é que entitlements ausentes são sintetizados ou persistidos como **habilitados** em login, criação de workspace e gestão de configurações. Esse default-on precisa de migração compatível antes que plano e feature passem a ser autoridade comercial.

## 4. Divergências de schema e migrations

### 4.1 História sem baseline inicial reproduzível

A primeira migration versionada altera tabelas técnicas que ela própria não cria. Assim, `prisma migrate deploy` contra um PostgreSQL vazio não possui uma cadeia SQL autossuficiente para materializar o schema completo.

O bootstrap local contorna isso com:

1. `prisma db push` em banco local vazio;
2. `prisma migrate resolve --applied` para cada diretório versionado.

Esse fluxo é aceitável apenas como conveniência local temporária. Ele não valida a execução histórica, não detecta todos os drifts e não pode ser usado como estratégia de produção.

### 4.2 Billing legado fora do schema atual

A migration `20260515120000_add_saas_billing_modules_marketing` criou, entre outros objetos, planos, módulos de plano, customer/provider de billing, subscription, webhook e marketing, além do enum `PaymentProvider` com Stripe/Manual. A migration seguinte ampliou preços/intervalos.

Os models correspondentes não aparecem no `schema.prisma` atual e não existe migration versionada que explique integralmente sua remoção. Portanto, bancos historicamente migrados podem conter objetos que o Prisma atual ignora.

### 4.3 Banco local compartilhado e reset autorizado

Antes do reset, o PostgreSQL local estava associado por labels Compose a outro checkout e apresentava:

- 59 tabelas públicas;
- 28 enums públicos;
- 33 migrations concluídas;
- 13 migrations sem diretório correspondente nesta branch;
- objetos adicionais de billing e administração de plataforma.

Esse estado foi classificado como contaminação entre checkouts, não como baseline desta branch. Com autorização expressa do usuário, apenas o banco local `calculadora_nutricional` em `127.0.0.1:54329` foi descartado e recriado. O Neon não foi acessado nem alterado.

Estado local posterior:

| Evidência | Resultado |
| --- | ---: |
| Tabelas públicas | 27 |
| Tabelas de domínio Prisma | 26 |
| Enums públicos | 11 |
| Migrations finalizadas | 20 |
| Migrations incompletas | 0 |
| Dados de domínio estimados | 0 |

Esse resultado prova a materialização do schema atual pelo bootstrap local, mas não resolve a história nem prova upgrade de banco real.

## 5. Conflitos e riscos priorizados

| Prioridade | Achado | Consequência | Tratamento exigido |
| --- | --- | --- | --- |
| Alta | História de migrations não autossuficiente e divergente | Release pode falhar, consolidar drift ou perder objetos/dados | ADR, baseline/reconciliação, fixture representativa e teste de upgrade |
| Alta | Entitlements ausentes habilitados por padrão | Concessão indevida ou quebra ao introduzir planos | Definir precedência, backfill explícito e transição compatível para deny-by-default |
| Alta | Operações globais dentro de `/dashboard/settings` e allowlist master operacional | Mistura de planos, privilégio amplo e ausência de step-up | Separar `/admin`, IAM interno, sessão privilegiada e break-glass restrito |
| Média | Auditoria sem ator/papel/resultado/motivo/correlação/before-after | Ações críticas não são plenamente atribuíveis ou reconstruíveis | Expandir contrato e tornar gravação parte da transação crítica |
| Média | Guard estático exige same-origin em todo POST mutável | Webhook externo não cabe no invariável atual | Criar exceção estreita por rota com autenticação Asaas, inbox e teste negativo |
| Média | Sem integração PostgreSQL/E2E de autorização | Regressões de tenant e migrations podem escapar do CI | Matriz de autorização e testes DB/E2E nos gates posteriores |
| Média | Configuração exemplo mantém Stripe/marketing e não define Asaas | Risco de configuração incoerente e segredos mal governados | Bundle de env por ambiente, server-only, sem valores reais no repositório |
| Média | Documento diz responder `2xx` ao webhook | Asaas pode reenviar quando não recebe o status esperado | Normatizar resposta HTTP 200 depois de persistir o inbox |
| Baixa | Documento arquitetural registra branch antiga e pacote está em `docs/implantacao-saas/` | Evidência pode ser atribuída ao checkout errado | Manter contexto de branch/HEAD em cada diário/relatório |

## 6. Fontes oficiais e decisões aplicadas

- A documentação oficial do [Next.js sobre autenticação](https://nextjs.org/docs/app/guides/authentication) sustenta autorização server-side próxima dos dados e trata Server Actions e Route Handlers como endpoints públicos. O [Proxy do Next.js](https://nextjs.org/docs/app/getting-started/proxy) fica restrito a checks otimistas.
- O [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) exige menor privilégio, deny-by-default e validação em cada requisição. O [AWS SaaS Lens](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/isolation-mindset.html) reforça que autenticação/autorização isoladas não bastam e que o isolamento tenant deve ser imposto por mecanismo compartilhado.
- O Prisma orienta [baseline de bancos existentes](https://www.prisma.io/docs/orm/prisma-migrate/getting-started), reserva [`migrate deploy`](https://www.prisma.io/docs/cli/migrate/deploy) para aplicar migrations versionadas e restringe [`db push` a prototipação](https://www.prisma.io/docs/orm/more/best-practices). Isso confirma que o bootstrap local atual não substitui a Etapa 1.
- O Asaas usa entrega [at-least-once e idempotência por ID de evento](https://docs.asaas.com/docs/como-implementar-idempotencia-em-webhooks). O [FAQ oficial de webhooks](https://docs.asaas.com/docs/faq-de-webhooks) especifica HTTP 200 como sucesso, mais estrito do que o `2xx` genérico dos documentos internos.
- O [checkout recorrente hospedado](https://docs.asaas.com/docs/checkout-com-assinatura-recorrente) e a [orientação PCI DSS](https://docs.asaas.com/docs/pci-dss-1) sustentam o MVP sem passagem de dados de cartão pelo backend SoIZI.
- A integração direta futura da Cora requer [mTLS e configuração por ambiente](https://developers.cora.com.br/docs/utiliza%C3%A7%C3%A3o-das-apis); não há credenciais nem implementação Cora no escopo atual.
- O [NIST SSDF 1.1](https://csrc.nist.gov/pubs/sp/800/218/final) permanece a referência final para integrar práticas seguras ao ciclo de desenvolvimento; eventual draft posterior não foi tratado como substituto normativo.

## 7. Plano real ajustado ao código

### Etapa 1 — obrigatória antes de qualquer feature

1. Produzir ADR objeto-a-objeto: preservar, adaptar, depreciar ou remover depois.
2. Definir baseline/história que funcione tanto para banco novo quanto para banco historicamente migrado.
3. Criar fixture representativa com organizações, memberships, entitlements, tabelas nutricionais e objetos legados de billing.
4. Provar upgrade aditivo, contagens, FKs, login, tenant context e fluxos críticos.
5. Manter escrita remota bloqueada; eventual Neon exige autorização separada, backup e plano de rollback.

### Etapa 2 em diante — somente após o gate de banco

1. Fundação de `/admin`, IAM interno e break-glass.
2. Catálogo versionado de planos/features/preços.
3. Resolver único de entitlement efetivo, com deny-by-default e compatibilidade explícita.
4. Adapter Asaas sandbox, checkout hospedado e webhook inbox idempotente.
5. Lifecycle, reconciliação, Control Plane comercial, métricas e hardening.

## 8. Critérios do gate

- [x] Arquitetura atual lida integralmente.
- [x] Schema e migrations inventariados.
- [x] Billing legado localizado.
- [x] Autenticação, autorização, módulos, organizações, segurança, CI e testes mapeados.
- [x] Fontes oficiais vigentes consultadas e registradas.
- [x] Nenhuma migration criada antes do baseline.
- [x] PostgreSQL local isolado e verificado após reset autorizado.
- [ ] História de migrations reconciliada — objeto da Etapa 1.
- [ ] Banco representativo atualizado sem perda — objeto da Etapa 1.

**Conclusão:** pode-se avançar exclusivamente à Etapa 1. Qualquer implementação de billing, IAM, catálogo ou interface administrativa permanece bloqueada até o próximo gate.
