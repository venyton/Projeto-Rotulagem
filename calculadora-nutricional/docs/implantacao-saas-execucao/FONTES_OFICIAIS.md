# Fontes oficiais

Consultas registradas em 25 e 26/08/2026. Fontes secundárias não foram usadas
como autoridade.

## Etapa 00 — Arquitetura e baseline

| Fonte | URL | Uso |
| --- | --- | --- |
| Next.js — Authentication | https://nextjs.org/docs/app/guides/authentication | Guardas seguras próximas ao dado; Proxy apenas como filtro otimista |
| OWASP — Authorization | https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html | Menor privilégio, deny-by-default e validação por requisição |
| OWASP — Logging | https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html | Eventos atribuíveis sem tokens, senhas ou PII desnecessária |
| AWS — SaaS isolation mindset | https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/isolation-mindset.html | Isolamento tenant separado de autenticação |
| NIST — SSDF 1.1 | https://csrc.nist.gov/pubs/sp/800/218/final | Práticas seguras incorporadas aos gates |

## Etapa 01 — Prisma Migrate 5.22

| Fonte | URL | Uso |
| --- | --- | --- |
| Prisma — Baselining | https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining | Baseline executada em banco novo e marcada em banco preexistente |
| Prisma — migrate diff | https://docs.prisma.io/docs/cli/migrate/diff | Provar convergência entre banco e schema |
| Prisma — migrate deploy | https://docs.prisma.io/docs/cli/migrate/deploy | Aplicar somente história versionada no fluxo de release |
| Prisma — CLI reference | https://docs.prisma.io/docs/orm/reference/prisma-cli-reference | Divergência ou migration falha bloqueia avanço |

## Etapa 02 — IAM interno e Control Plane

| Fonte | Versão/ambiente | URL | Decisão sustentada |
| --- | --- | --- | --- |
| Next.js — Authentication | Next.js 16.2.12 / App Router | https://nextjs.org/docs/app/guides/authentication | DAL/serviço server-only faz autorização segura; layout e UI não são a única defesa |
| Next.js — Proxy | Next.js 16.2.12 | https://nextjs.org/docs/app/getting-started/proxy | Proxy não fará consulta lenta ao banco nem será a autorização final |
| Next.js — Upgrade v16 | Next.js 16 | https://nextjs.org/docs/app/guides/upgrading/version-16 | Convenção atual é `proxy.ts`; não introduzir middleware legado |
| OWASP — Authorization | Aplicação web | https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html | Role/permission em deny-by-default e teste negativo por ação |
| OWASP — Logging | Aplicação web | https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html | Auditoria sanitizada; nunca registrar sessão, token, senha ou segredo |
| Microsoft Entra — PIM | Referência conceitual JIT | https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure | Assignments temporários, MFA, justificativa e auditoria para privilégios avançados |
| shadcn/ui — Sidebar | Radix / new-york / RSC | https://ui.shadcn.com/docs/components/sidebar | Shell responsivo, estado móvel e navegação acessível |
| shadcn/ui — componentes | Radix / new-york / RSC | https://ui.shadcn.com/docs/components | Cards, badges, alerts, dropdown, avatar, table e empty state compostos com primitives locais |

Contratos de segurança aplicados: deny-by-default, menor privilégio, autorização
em toda requisição server-side, assignments com validade temporal, break-glass
com 2FA e logs sanitizados. Limite conhecido: PIM foi usado como referência
conceitual; não há integração com Microsoft Entra.

## Etapa 03 — Catálogo comercial versionado

| Fonte | Versão/ambiente | URL | Decisão sustentada |
| --- | --- | --- | --- |
| Prisma — Transactions | Prisma 5.22 / PostgreSQL | https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions | Criar plano e publicar versão como unidades ACID; nenhuma chamada de rede dentro da transação |
| Prisma — Schema reference | Prisma 5.22 / PostgreSQL | https://www.prisma.io/docs/orm/reference/prisma-schema-reference | IDs, relações e constraints compostas representadas no schema |
| Prisma — Models | Prisma / PostgreSQL | https://www.prisma.io/docs/orm/v6/prisma-schema/data-model/models | Unicidade de versão por plano e composição por feature |
| Next.js — Forms | Next.js 16.2.12 / App Router | https://nextjs.org/docs/app/guides/forms | FormData validado no servidor e Server Actions como fronteira de mutação |
| shadcn/ui — Components | Radix / new-york / RSC | https://ui.shadcn.com/docs/components | Cards, alerts, badges, inputs e estados responsivos compostos com primitives locais |

Limites: a pesquisa da Etapa 03 não definiu comportamento de provider, proration
ou checkout. Preço é provider-neutral e Asaas permanece reservado às Etapas 05–07.

## Etapa 04 — Entitlements, limites e concorrência

Consulta realizada em 26/08/2026 antes de consolidar o enforcement de seats.

| Fonte | Versão/ambiente | URL | Decisão sustentada |
| --- | --- | --- | --- |
| PostgreSQL — Explicit Locking | PostgreSQL 16 / local 16.13 | https://www.postgresql.org/docs/16/explicit-locking.html | Advisory lock tem significado definido pela aplicação; lock transacional é liberado automaticamente e requisições conflitantes bloqueiam |
| PostgreSQL — Advisory Lock Functions | PostgreSQL 16 / local 16.13 | https://www.postgresql.org/docs/16/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS | `pg_advisory_xact_lock` obtém lock exclusivo transacional e espera pela mesma chave |
| PostgreSQL — Transaction Isolation | PostgreSQL 16 / local 16.13 | https://www.postgresql.org/docs/16/transaction-iso.html | Em `ReadCommitted`, cada comando recebe snapshot novo e a recontagem posterior ao lock vê commits anteriores |
| Prisma — Transactions | Prisma 5.22 / PostgreSQL | https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions | Interactive transaction mantém lock, leitura e escrita na mesma conexão e permite configurar `ReadCommitted` |
| OWASP — Authorization | Aplicação web | https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html | Ausência de regra explícita deve negar; autorização deve ser validada em toda requisição |

Aplicação: o lock usa chave derivada apenas do `organizationId`, toda mutação de
seat passa pelo mesmo serviço e nenhuma chamada externa ocorre dentro da
transação. O retorno `void` da função é convertido para `text` apenas para o
Prisma desserializar a consulta; isso não altera a semântica do lock.

## Etapa 05 — Asaas Sandbox e adapter

Consulta realizada em 26/08/2026. A referência atual aponta para API v3. O
Sandbox real não foi chamado porque não existe chave configurada.

| Fonte oficial | Atualização exibida | URL | Decisão sustentada |
| --- | --- | --- | --- |
| Asaas — Authentication | página consultada em 26/08/2026 | https://docs.asaas.com/docs/authentication | Header `access_token`, `User-Agent`, chave por ambiente, host Sandbox `api-sandbox.asaas.com/v3` e prefixo `$aact_hmlg_` |
| Asaas — Sandbox | página consultada em 26/08/2026 | https://docs.asaas.com/docs/sandbox-2 | Sandbox é independente e não move fundos reais; produção não substitui homologação |
| Asaas — What can be tested | atualizada há cerca de 2 meses | https://docs.asaas.com/docs/what-can-be-tested | Criação/listagem de customers são suportadas no Sandbox; limitações devem ser verificadas por recurso |
| Asaas — Create new customer | atualizada há cerca de 3 meses | https://docs.asaas.com/reference/create-new-customer | `POST /v3/customers`, campos mínimos, ID remoto persistido, `externalReference` recomendado e duplicidade permitida |
| Asaas — List customers | atualizada há cerca de 3 meses | https://docs.asaas.com/reference/list-customers | `GET /v3/customers`, filtro `externalReference`, `limit` até 100 e GET sem body |
| Asaas — Retrieve a single customer | atualizada há cerca de 3 meses | https://docs.asaas.com/reference/retrieve-a-single-customer | `GET /v3/customers/{id}` para validar mapping por ID; GET sem body |
| Asaas — Remove customer | atualizada há cerca de 1 mês | https://docs.asaas.com/reference/remove-customer | `DELETE /v3/customers/{id}` para limpar exclusivamente a fixture Sandbox criada pelo contrato |
| Asaas — HTTP response codes | atualizada há cerca de 11 meses | https://docs.asaas.com/reference/http-response-codes | Classificação 400/401/403/404/429/500 sem expor descrição remota ao usuário |
| Asaas — API limits | atualizada há cerca de 12 meses | https://docs.asaas.com/docs/api-limits-1 | `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, 429 e ausência de polling agressivo |
| Asaas — Webhooks introduction | página consultada em 26/08/2026 | https://docs.asaas.com/docs/about-webhooks | Token próprio em `asaas-access-token`, entrega at-least-once e event ID estável; implementação fica na Etapa 07 |

Decisões aplicadas: host não é configurável livremente; produção exige runtime e
gate explícitos; customer mapping consulta `externalReference` antes de criar;
POST não recebe retry cego; falha ambígua é reconciliada por GET; documento do
pagador não é persistido no mapping local; erros e diagnóstico são sanitizados.

Pesquisa preliminar também confirmou que o Checkout hospedado usa
`POST /v3/checkouts`, `RECURRENT` e confirmação assíncrona por webhook. Nenhum
payload de checkout foi implementado na Etapa 05; a referência será reconsultada
e registrada na Etapa 06 antes do uso.

## Etapa 06 — Checkout recorrente, assinaturas e cobranças

Consulta realizada em 26/08/2026 antes da implementação. Asaas API v3, páginas
oficiais e OpenAPI gerado pela própria referência. Nenhuma chamada de API foi
feita porque a chave Sandbox está ausente.

| Fonte oficial | Atualização exibida | URL | Decisão sustentada |
| --- | --- | --- | --- |
| Asaas — Create new checkout | OpenAPI atualizado em 29/06/2026 | https://docs.asaas.com/reference/create-new-checkout | `POST /v3/checkouts`; `billingTypes`, `chargeTypes`, `callback` e `items` obrigatórios; `RECURRENT` exige `subscription`; expiração 10–1440 min; external reference até 200; resposta contém `id`, `link`, `status` e referência |
| Asaas — Asaas Checkout | atualizada há cerca de 2 meses | https://docs.asaas.com/docs/asaas-checkout | página hospedada; persistir ID/link/status; callback é navegação, não prova de pagamento; estados `ACTIVE`, `CANCELED`, `EXPIRED`, `PAID` |
| Asaas — Checkout with Subscription | atualizada há cerca de 12 meses | https://docs.asaas.com/docs/checkout-with-subscription-recurring | `CREDIT_CARD` + `RECURRENT`; objeto `subscription` com cycle e next due date; cartão permanece no provider |
| Asaas — How to provide customer data | atualizada há cerca de 12 meses | https://docs.asaas.com/docs/how-to-provide-customer-data | usar exclusivamente `customer` ou `customerData`; ID remoto existente evita reenviar dados do pagador |
| Asaas — Checkout link and redirection | atualizada há cerca de 1 mês | https://docs.asaas.com/docs/checkout-link-and-customer-redirection | URL é derivada do ID retornado; adapter valida o link retornado e não aceita URL do browser |
| Asaas — Cancel a checkout | atualizada há cerca de 3 meses | https://docs.asaas.com/reference/cancel-a-checkout | `POST /v3/checkouts/{id}/cancel`, sem body, respostas 200/400/401/404; cancelamento local exige ID remoto |
| Asaas — Events for Checkout | página consultada em 26/08/2026 | https://docs.asaas.com/docs/checkout-events | eventos `CHECKOUT_CREATED`, `CHECKOUT_CANCELED`, `CHECKOUT_EXPIRED`, `CHECKOUT_PAID`; entrega at-least-once, persistir antes de responder e deduplicar por `id` na Etapa 07 |
| Next.js — Forms | Next.js 16.2.12 | https://nextjs.org/docs/app/guides/forms | Server Action recebe `FormData`; validação cliente é UX e validação servidor continua autoritativa; pending state evita duplo envio |
| Next.js — redirect | Next.js 16.2.12 | https://nextjs.org/docs/app/api-reference/functions/redirect | redirect externo é suportado; em Server Action produz 303 e deve ser chamado fora de `try/catch` |
| Prisma — Transactions | Prisma 5.22 | https://www.prisma.io/docs/orm/prisma-client/queries/transactions | invariantes locais de tentativa/assinatura são atômicas; nenhuma chamada de rede ocorre dentro da transação |
| Prisma — Schema reference | Prisma 5.22 | https://www.prisma.io/docs/orm/reference/prisma-schema-reference | constraints únicas viram índices e bloqueiam external reference/provider ID duplicados |

### Divergência oficial registrada

O guia `How to provide customer data` documenta `customer` como ID de um customer
existente e proíbe combinar `customer` com `customerData`. O OpenAPI atual de
`Create new checkout` não lista `customer`, embora o guia oficial o recomende.
Não foi feita interpretação silenciosa: o detalhe ficará isolado no adapter,
`RISK-010` registra a divergência e o teste real no Sandbox é obrigatório antes
de habilitar o fluxo externamente.

### Limites assumidos na implementação local

- MVP recorrente oferece somente `CREDIT_CARD`; Pix recorrente continua OFF;
- período do preço é mapeado apenas para ciclos oficialmente enumerados;
- itens são montados de valores em centavos relidos do banco;
- nenhum payload, documento, PAN, CVV, token ou raw error é persistido/logado;
- callback apenas informa `processando`, `cancelado` ou `expirado`; a ativação
  comercial depende dos eventos e da reconciliação da Etapa 07.

## Etapa 07 — Webhooks, replay e reconciliação

Consulta realizada em 27/08/2026, antes da implementação. Nenhum endpoint Asaas
foi chamado; a API v3 foi validada por contrato e provider fake.

| Fonte oficial | Atualização exibida | URL | Decisão sustentada |
| --- | --- | --- | --- |
| Asaas — Idempotency in Webhooks | consultada em 27/08/2026 | https://docs.asaas.com/docs/how-to-implement-idempotence-in-webhooks | event `id` único; persistir inbox antes do HTTP 200; processar depois |
| Asaas — Receive events | atualizada há cerca de 2 meses | https://docs.asaas.com/docs/receive-asaas-events-at-your-webhook-endpoint | header `asaas-access-token`; token 32–255, sem espaços e diferente da API key |
| Asaas — Webhooks FAQ | consultada em 27/08/2026 | https://docs.asaas.com/docs/webhooks-faq | somente HTTP 200 confirma; 15 falhas interrompem fila; retenção até 14 dias; 10 s de timeout |
| Asaas — Checkout events | atualizada há cerca de 2 meses | https://docs.asaas.com/docs/checkout-events | quatro eventos, at-least-once, campos futuros tolerados e fluxo persistir → 200 → processar |
| Asaas — Subscription events | consultada em 27/08/2026 | https://docs.asaas.com/docs/subscription-events | identificar por `subscription.id`, não depender de ordem e não usar criação como pagamento |
| Asaas — Payment events | atualizada há cerca de 2 meses | https://docs.asaas.com/docs/payment-events | `CONFIRMED` é pago ainda indisponível; `RECEIVED` tem fundos; overdue/refund/chargeback não podem regredir |
| Asaas — List payments | atualizada há cerca de 3 meses | https://docs.asaas.com/reference/list-payments | reconciliação sob demanda por `checkoutSession`; GET sem body, paginação e sem polling contínuo |
| Next.js — `after` | Next.js 16.2.12 | https://nextjs.org/docs/app/api-reference/functions/after | processamento pode continuar após a resposta do Route Handler |
| Next.js — Route Handlers | Next.js 16.2.12 | https://nextjs.org/docs/app/getting-started/route-handlers | endpoint usa Request/Response nativos e body JSON explicitamente validado |

Decisões aplicadas: payload bruto não é armazenado; uma projeção allowlist é
persistida com hash. Evento desconhecido válido vira `IGNORED`; evento conhecido
sem vínculo vira `FAILED` e pode ser reprocessado. Checkout pago sozinho não
ativa entitlement. Reconciliação consulta somente um checkout conhecido e exige
que todos os recursos retornados permaneçam no mesmo escopo.

## Etapa 08 — Administração de clientes

Consulta realizada em 27/08/2026 antes da implementação. Nenhum endpoint de
provider foi necessário ou chamado.

| Fonte oficial | Atualização exibida | URL | Decisão sustentada |
| --- | --- | --- | --- |
| Next.js — Layouts and Pages | Next.js 16.2.12 | https://nextjs.org/docs/app/getting-started/layouts-and-pages | `params` e `searchParams` assíncronos em Server Components; filtros de banco pertencem à página do servidor |
| Next.js — Page file convention | Next.js 16.2.12 | https://nextjs.org/docs/app/api-reference/file-conventions/page | segmentos dinâmicos e entrada de busca são tratados como input não confiável e validados antes da query |
| Prisma — Filtering and Sorting | Prisma ORM v6 docs | https://www.prisma.io/docs/orm/v6/prisma-client/queries/filtering-and-sorting | filtros compostos com `where`/relações e ordenação explícita |
| Prisma — Pagination | Prisma ORM v6 docs | https://www.prisma.io/docs/orm/v6/prisma-client/queries/pagination | offset pagination somente para conjunto administrativo raso, com `skip`/`take` limitado |

As decisões de autorização, menor privilégio e isolamento continuam baseadas nas
fontes oficiais registradas na Etapa 02. A tela não amplia autoridade: cada
seção depende da permission persistida e o DTO exclui conteúdo do cliente.

## Etapa 09 — Cupons, grants e overrides

Consulta realizada em 27/08/2026 antes da implementação. O contrato Asaas foi
revisado sem chamada ao endpoint.

| Fonte oficial | Atualização exibida | URL | Decisão sustentada |
| --- | --- | --- | --- |
| Asaas — Create new checkout | atualizada há cerca de 2 meses | https://docs.asaas.com/reference/create-new-checkout | checkout recebe itens/valores e `externalReference`; resultado continua assíncrono e acompanhado por webhooks |
| Asaas — Checkout with Subscription | atualizada há cerca de 12 meses | https://docs.asaas.com/docs/checkout-with-subscription-recurring | recorrência usa o valor dos itens e ciclo no checkout hospedado |
| Prisma — Transactions | Prisma ORM v6 docs | https://www.prisma.io/docs/orm/prisma-client/queries/transactions | read-modify-write fica em transação curta; isolamento e retry devem tratar conflitos concorrentes |
| PostgreSQL — Constraints | PostgreSQL 18 | https://www.postgresql.org/docs/current/ddl-constraints.html | unicidade composta e checks preservam invariantes além da aplicação |
| PostgreSQL — INSERT / ON CONFLICT | PostgreSQL 18 | https://www.postgresql.org/docs/current/sql-insert.html | unique index arbitra inserções concorrentes; lock/advisory e constraint são defesa conjunta |

Não foi encontrado campo oficial de “coupon” no contrato vigente do Checkout.
Por isso o desconto é resolvido internamente antes da chamada e o provider recebe
somente o valor final em centavos, que também é usado na reconciliação.

## Etapa 10 — Métricas e consumo

Consulta realizada em 27/08/2026 antes da implementação. Nenhuma integração de
telemetria externa foi adicionada; a fonte primária continua sendo o PostgreSQL.

| Fonte oficial | Versão/data | URL | Decisão sustentada |
| --- | --- | --- | --- |
| Prisma — Transactions | Prisma ORM v6 docs, consultada em 27/08/2026 | https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions | transação interativa curta, isolamento explícito, idempotência e ausência de rede dentro da transação |
| PostgreSQL — INSERT / ON CONFLICT | PostgreSQL 18, consultada em 27/08/2026 | https://www.postgresql.org/docs/current/sql-insert.html | unique index é o árbitro determinístico para a chave idempotente e o agregado |
| PostgreSQL — Advisory Locks | PostgreSQL 18, consultada em 27/08/2026 | https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS | lock transacional serializa consumo por tenant/feature/período e é liberado no fim da transação |
| Next.js — Instrumentation | Next.js 16.2.12, atualizada em 27/02/2026 | https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation | instrumentação de runtime é server-side; métricas comerciais persistidas não dependem de Web Vitals do cliente |

Aplicação: microeventos comuns continuam contagens derivadas; ledger é reservado
para consumo/quota que precisa de deduplicação. Fronteiras mensais usam UTC e o
dashboard administrativo executa queries limitadas no servidor.

## Etapa 11 — Privilégios, step-up e suporte

Consulta realizada em 27–28/08/2026 antes e durante a implementação.

| Fonte oficial | Versão/data | URL | Decisão sustentada |
| --- | --- | --- | --- |
| NIST SP 800-63B | edição vigente publicada em 26/08/2025 | https://pages.nist.gov/800-63-4/sp800-63b.html | step-up eleva assurance; reautenticação confirma presença; sessão tem timeout definido e OTP precisa de resistência a replay |
| Microsoft Entra PIM — Activate roles | consultada em 27/08/2026 | https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-how-to-activate-role | ativação elegível usa MFA, duração, escopo reduzido, motivo e aprovação quando configurada |
| Microsoft Entra PIM — Role settings | consultada em 27/08/2026 | https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-how-to-change-default-settings | justificativa, ticket, approval e duração máxima são controles próprios da elevação |
| OWASP — Multifactor Authentication | consultada em 27/08/2026 | https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html | MFA em ações administrativas sensíveis, rate limit e recuperação controlada |
| OWASP — Authentication | consultada em 27/08/2026 | https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html | reautenticação para eventos críticos e redução de privilégio após mudança de risco |
| RFC 6238 | RFC vigente | https://datatracker.ietf.org/doc/html/rfc6238 | TOTP deriva time step; verificador limita janela e impede reutilização aceita |
| otplib — Security | otplib 13.4.0 instalado | https://github.com/yeojz/otplib/blob/main/SECURITY.md | versão 13 suportada; aplicação combina verificação com proteção de sessão, rate limit e armazenamento seguro |
| otplib — TOTP replay protection | otplib 13.4.0 instalado | https://github.com/yeojz/otplib/blob/main/README.md | `timeStep` aceito é persistido e enviado como `afterTimeStep` na próxima verificação |
| NextAuth.js — Options / Session | NextAuth 4.24.15 | https://next-auth.js.org/configuration/options#session | sessão JWT usa cookie HTTP-only JWE e duração/update age configuráveis; elevação é vinculada ao cookie sem armazená-lo |
| NextAuth.js — Callbacks | NextAuth 4.24.15 | https://next-auth.js.org/configuration/callbacks | JWT/session callbacks definem a projeção exposta e não substituem autorização server-side |
| Next.js — revalidatePath | Next.js 16.2.12, atualizada em 27/02/2026 | https://nextjs.org/docs/app/api-reference/functions/revalidatePath | Server Action invalida o layout `/admin` para refletir ativação/revogação imediatamente |
| PostgreSQL — Constraints | PostgreSQL 16 local / docs atuais | https://www.postgresql.org/docs/current/ddl-constraints.html | checks preservam duração, pares de destino/approval e proíbem requester igual ao approver |

Aplicação: o código TOTP nunca é persistido; só o último time step aceito. O
cookie nunca é armazenado; somente HMAC de 64 caracteres. O Control Plane mantém
suporte por metadata e não introduz acesso global ao conteúdo do tenant.
