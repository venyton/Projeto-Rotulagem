# Changelog da implementação

## 2026-08-25 — Etapa 00 concluída

- inventariados runtime, schema, migrations, rotas, autorização, tenant isolation,
  entitlements, segurança e CI;
- identificadas a ausência de baseline e a divergência de billing histórico;
- resetado somente o PostgreSQL local após autorização explícita;
- Neon, Asaas e Cora não foram acessados;
- `GATE: APROVADO` para iniciar exclusivamente a Etapa 01.

## 2026-08-25 — Etapa 01 concluída

- adicionada baseline histórica anterior ao Prisma Migrate;
- adicionada reconciliação aditiva de colunas, enums e objetos legados;
- removida a dependência de `db push` do bootstrap de banco novo;
- criado teste automatizado de instalação limpa e upgrade com dados sintéticos;
- preservado `OrganizationRole.BILLING` no ramo de menor privilégio;
- aprovados check, 57 testes de domínio, segurança, migrations, build e diff;
- `GATE: APROVADO` para iniciar a Etapa 02 localmente.

## 2026-08-25 — Etapa 02 concluída

- adicionados IAM de plataforma persistido, 9 roles, 21 permissions e 72 grants;
- implementado guard server-only deny-by-default, assignments temporais e
  break-glass condicionado a 2FA;
- ampliada a auditoria sanitizada com permission, resultado, motivo e correlação;
- criados shell `/admin`, visão geral, operadores, auditoria e endpoint direto;
- negados anonimamente e usuários tenant comuns; validado assignment `AUDITOR`;
- corrigidos separação do chrome público, contraste, landmarks e fechamento da
  navegação móvel;
- aprovados check, 62 testes, segurança, migration limpa/upgrade, build de 33
  páginas, diff e acessibilidade em light/dark e desktop/mobile;
- fixtures e logs de teste removidos somente do PostgreSQL local;
- `GATE: APROVADO` para iniciar a Etapa 03 localmente.

## 2026-08-25 — Etapa 03 concluída

- criado catálogo versionado com 4 entidades, 5 enums e 11 features estáveis;
- planos legados são convertidos aditivamente em versão 1 publicada;
- subscriptions legadas recebem referência de versão quando há plano;
- instalados e exercitados 3 triggers de imutabilidade comercial;
- implementadas validação de domínio, transações, auditoria e permissions de
  leitura, gestão e publicação;
- criada UI `/admin/catalog` e endpoint direto com `no-store`;
- validado fluxo local draft → publish com 6 features e 2 preços, depois removido;
- usuário anônimo/tenant comum negados e `PRODUCT_ADMIN` autorizado;
- aprovados check com 70 testes, segurança, migrations, build de 35 páginas,
  diff e acessibilidade desktop/mobile light/dark;
- `GATE: APROVADO` para iniciar a Etapa 04 localmente.

## 2026-08-26 — Etapa 04 concluída

- adicionado resolvedor central de entitlements com precedência determinística;
- novas organizações usam deny-by-default `v2`; dados migrados preservam a
  compatibilidade explícita e observável `v1`;
- adicionados grants e overrides por organização, com validade, motivo e ator;
- migrados módulos de sessão, participantes e API token para a resolução central;
- criado enforcer genérico de limite e regra única de seats;
- criação, vínculo e reativação de membro passaram a usar advisory lock
  transacional por organização;
- comprovados grandfathering e limite concorrente 2, com uma criação, uma
  negação e contagem final 2;
- aprovados check com 84 testes, segurança, migrations limpa/upgrade, smoke
  persistido, build de 35 páginas e diff;
- consumo periódico e reset de quota foram mantidos explicitamente para a Etapa
  10, sem inventar ledger nesta etapa;
- `GATE: APROVADO` para iniciar a Etapa 05 localmente.

## 2026-08-26 — Etapa 05 implementada localmente, gate bloqueado

- registrada pesquisa oficial vigente de autenticação, Sandbox, customers,
  erros, limites e fronteiras de webhooks;
- criado contrato interno `BillingProvider` e adapter Asaas server-only;
- host é derivado do ambiente e produção exige duplo gate além da chave correta;
- adicionados erros sanitizados, rate-limit metadata e diagnóstico sem segredos;
- criado customer mapping com estado, lease, external reference e auditoria;
- corrida local e POST ambíguo foram exercitados sem retry financeiro cego;
- migration preserva mapping Stripe histórico e adiciona `ASAAS` de forma aditiva;
- aprovados check com 97 testes, segurança, migration limpa/upgrade, runtime local,
  build de 35 páginas e diff;
- o teste oficial Sandbox não executou porque `ASAAS_API_KEY` está ausente;
- `GATE: BLOQUEADO`; Etapa 06 não iniciada.

## 2026-08-26 — Gate local da Etapa 05 aprovado por decisão humana

- homologação externa Asaas foi transferida para o gate final da Etapa 12;
- riscos de credencial ausente e divergência de contrato permanecem explícitos;
- nenhuma chamada Asaas ou Neon foi autorizada;
- `GATE: APROVADO` no escopo local comprovado;
- Etapa 06 iniciada com Checkout hospedado e callback não autoritativo.

## 2026-08-27 — Etapa 06 concluída localmente

- adicionados tentativa de checkout e charge provider-neutral por migration aditiva;
- criado Checkout recorrente hospedado, sem captura de cartão pela SoIZI;
- preço, versão, ciclo e tenant são relidos no servidor;
- claim por organização reutiliza tentativa ativa e bloqueia resultado ambíguo;
- callbacks exibem somente estado de UX e não concedem acesso;
- cancelamento cross-tenant foi negado antes de qualquer chamada ao provider;
- aprovados 104 testes, segurança, migration limpa/upgrade, runtime local, build
  de 36 páginas e diff;
- divergência do campo `customer` e homologação externa permanecem na Etapa 12;
- `GATE: APROVADO` no escopo local; Etapa 07 iniciada.

## 2026-08-27 — Etapa 07 concluída localmente

- evoluída a tabela histórica para inbox autenticada, idempotente e reprocessável;
- payloads novos são projeções allowlist com hash, nunca o corpo financeiro bruto;
- implementados token timing-safe, limite 256 KiB, HTTP 200 pós-commit e `after()`;
- processador serializa efeitos e tolera campos/eventos futuros;
- pagamento confirmado ativa; checkout/redirect e criação de assinatura não ativam;
- estados fora de ordem não regressam e falhas podem ser reprocessadas;
- reconciliação por `checkoutSession` foi isolada no provider e testada sem polling;
- 10 entregas/10 processadores produziram uma inbox e uma charge;
- migration forward-fix resolveu truncamento de índice detectado no dry-run;
- aprovados 109 testes, segurança, clean/upgrade, runtime, build e diff;
- `GATE: APROVADO` local; Etapa 08 iniciada.

## 2026-08-27 — Etapa 08 concluída localmente

- criadas lista paginada, detalhe por seções e visão operacional de billing;
- filtros cobrem status, billing, nome, e-mail administrativo e documento
  mascarado, sem carregar datasets de conteúdo do tenant;
- acesso a billing, membros, entitlements, segurança e auditoria respeita
  permissions independentes no servidor;
- suspensão/reativação é reversível, justificada e auditada com before/after;
- reconciliação e replay validam permission e escopo; sem chave ficam inertes;
- smoke local comprovou projeção metadata-only, máscara, isolamento entre dois
  tenants, auditoria e negação de update para papel somente-leitura;
- browser validou lista/detalhe, desktop e 390 px, sem overflow ou overlay;
- aprovados check/tipos, segurança com 0 vulnerabilidades, clean/upgrade com 29
  migrations, build de 38 páginas, runtime local e diff;
- `GATE: APROVADO` local; Etapa 09 iniciada.

## 2026-08-27 — Etapa 09 concluída localmente

- adicionadas 5 tabelas e 3 enums para coupons, redemptions e commercial grants;
- desconto percentual/fixo usa inteiros e não pode zerar o checkout;
- redemption persiste preço-base, desconto e valor final como snapshot;
- advisory lock por código e constraints impediram double redemption concorrente;
- checkout, subscription event, payment event e reconciliação usam o snapshot;
- falha definitiva/cancelamento/expiração revogam uso; resultado ambíguo preserva;
- commercial grants entram no resolvedor sem substituir grants legados;
- telas distinguem cupom, grant e override e destacam permanência sem depender de cor;
- 2 resgates simultâneos produziram 1 aceite; provider fake recebeu 8.000 centavos;
- regressões dos runtimes de checkout/webhook passaram;
- aprovados 118 testes, segurança, clean/upgrade com 51 tabelas, 29 enums e 30
  migrations, build de 40 páginas, browser desktop/mobile e diff;
- `GATE: APROVADO` local; Etapa 10 iniciada.

## 2026-08-27 — Etapa 10 concluída localmente

- adicionados ledger idempotente e agregado mensal UTC por tenant/feature;
- advisory lock e transação impedem oversubscription concorrente de quota;
- instrumentados consumos server-side de IA, API e exportação Enterprise;
- contagens de recursos continuam derivadas das tabelas autoritativas;
- MRR/ARR usam subscriptions reconciliadas, nunca checkout criado;
- criado `/admin/metrics` com visão global e saúde limitada a 25 tenants;
- corrigida rolagem do Control Plane em viewport mobile;
- runtime provou quota 2, duplicate no-op, reset mensal e isolamento tenant A/B;
- aprovados 121 testes, segurança com 0 vulnerabilidades, clean/upgrade com 53
  tabelas, 29 enums e 31 migrations, build de 41 páginas e browser light/dark;
- registrado `RISK-012` para o upsert acidental de uma fixture no Neon; nenhuma
  nova consulta ou remediação remota foi feita sem autorização;
- `GATE: APROVADO` local; Etapa 11 iniciada.

## 2026-08-28 — Etapa 11 concluída localmente

- adicionadas sessões privilegiadas JIT de 5/10/15 minutos, escopo exato e
  vínculo HMAC ao cookie atual;
- step-up TOTP passou a bloquear replay por time step no login, perfil e PIM;
- HIGH ativa com MFA; CRITICAL exige maker-checker e MFA do aprovador;
- autoaprovação é negada no domínio, serviço e constraint PostgreSQL;
- publicação, cupons, grants, overrides e suspensão usam authorization elevada;
- gestão de operadores ganhou criação/revogação crítica e proteção do último
  Platform Owner;
- audit logs passaram a referenciar diretamente a sessão privilegiada;
- criado console de sessões com indicador permanente, expiração e revogação;
- suporte permaneceu metadata-only, sem conteúdo nem impersonation;
- runtime provou replay, binding, escopo, maker-checker e correlação de audit;
- browser provou ação HIGH, negação por ID adulterado, pedido CRITICAL,
  revogação, 1440/390 px, light/dark e teclado;
- aprovados 126 testes, segurança com 0 vulnerabilidades, clean/upgrade com 54
  tabelas, 30 enums e 32 migrations, build de 42 páginas e diff;
- fixtures locais foram removidas; Neon e Asaas não foram acessados;
- `GATE: APROVADO` local; Etapa 12 iniciada.
