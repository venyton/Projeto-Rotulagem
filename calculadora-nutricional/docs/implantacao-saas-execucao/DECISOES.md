# Decisões da implantação

## DEC-001 — Baseline anterior ao Prisma Migrate

Data: 25/08/2026
Etapa: 01
Status: ACEITA

### Contexto

A primeira migration ativa alterava cinco tabelas que não eram criadas pela
história versionada.

### Opções avaliadas

Manter `db push`; reescrever migrations antigas; adicionar baseline histórica.

### Decisão

Adicionar uma baseline anterior às migrations existentes, sem alterar checksums:
bancos novos a executam e bancos preexistentes a marcam como aplicada após
inventário.

### Base oficial

Prisma Migrate — Baselining e `migrate deploy`.

### Consequências

A história passa a ser reproduzível. Neon exige inventário, backup e autorização
antes de qualquer resolução ou deploy.

### Possível reversão futura

Não remover migrations aplicadas; qualquer consolidação futura exige release
específico e compatibilidade comprovada.

## DEC-002 — Preservar objetos históricos sem ativá-los

Data: 25/08/2026
Etapa: 01
Status: ACEITA

### Contexto

Sete tabelas e quatro enums históricos existiam no replay SQL, mas não no schema
Prisma corrente.

### Opções avaliadas

Descartar; ignorar o drift; restaurar o mapeamento e evoluir aditivamente.

### Decisão

Restaurar models/enums e reconciliar colunas de forma aditiva. Existência não
concede entitlement, billing ou permissão.

### Base oficial

Prisma `migrate diff`, política local de migrations aditivas e preservação de
dados.

### Consequências

O enum `OrganizationRole.BILLING` permanece como dado legado e deve cair sempre
no ramo de menor privilégio.

### Possível reversão futura

Deprecação destrutiva apenas após migração de dados, telemetria e gate humano.

## DEC-003 — IAM de plataforma separado de plano e papel tenant

Data: 25/08/2026
Etapa: 02
Status: ACEITA

### Contexto

`INTERNAL_MASTER_EMAILS` concedia autoridade global sem role/permission
persistidos, enquanto `OrganizationRole` pertence ao workspace do cliente.

### Opções avaliadas

Reaproveitar papel tenant; manter só allowlist; criar IAM de plataforma
independente e granular.

### Decisão

Persistir roles, permissions, grants e assignments de plataforma em entidades
próprias. Plano comercial e papel tenant nunca concedem permission interna.

### Base oficial

OWASP Authorization e Microsoft Entra PIM como referência conceitual para menor
privilégio, deny-by-default e validade temporal.

### Consequências

Todo acesso `/admin` exige permission explícita efetiva. A allowlist permanece
somente como bootstrap/break-glass e exige 2FA.

### Possível reversão futura

Roles e permissions podem evoluir por migrations aditivas; não unir os domínios
de autoridade.

## DEC-004 — Autorização final próxima da operação server-side

Data: 25/08/2026
Etapa: 02
Status: ACEITA

### Contexto

Layout e navegação filtrada melhoram UX, mas podem ser contornados por acesso
direto a Route Handlers ou futuras Server Actions.

### Opções avaliadas

Confiar no Proxy; confiar no layout; centralizar um serviço server-only e repetir
o guard em cada operação administrativa.

### Decisão

Usar o layout apenas para composição/redirect e executar autorização final no
serviço server-only em cada página, endpoint ou mutação sensível.

### Base oficial

Next.js Authentication recomenda uma data access layer e checagens seguras perto
da fonte de dados; OWASP exige autorização em toda requisição.

### Consequências

A UI nunca é autoridade. Acesso negado também produz auditoria sanitizada.

### Possível reversão futura

O serviço pode ser otimizado ou cacheado por requisição, preservando o mesmo
contrato deny-by-default.

## DEC-005 — Versões publicadas e composição protegidas no banco

Data: 25/08/2026
Etapa: 03
Status: ACEITA

### Contexto

O modelo legado permitia alterar plano, módulos e valores in-place, reescrevendo
o contrato de clientes existentes.

### Opções avaliadas

Confiar só na UI; validar apenas no serviço; versionar e reforçar imutabilidade
também no PostgreSQL.

### Decisão

Planos têm versões; features pertencem à versão e preços são registros próprios.
Depois de publicada, a versão e sua composição não aceitam alteração material.
Preço publicado pode ser arquivado, e qualquer novo valor cria outro registro.

### Base oficial

Prisma constraints/transactions e invariantes normativas do catálogo SoIZI.

### Consequências

Grandfathering é representável e tentativas de bypass fora do serviço também são
rejeitadas. Mudanças comerciais exigem nova versão/preço e audit trail.

### Possível reversão futura

Triggers podem ser substituídos por mecanismo equivalente somente após teste de
upgrade e prova de mesma proteção no banco.

## DEC-006 — Migração aditiva do catálogo legado

Data: 25/08/2026
Etapa: 03
Status: ACEITA

### Contexto

`Plan`, `PlanModule`, preços embutidos e referências Stripe podem conter dados
históricos ainda consumidos por fluxos antigos.

### Opções avaliadas

Remover campos; renomear tabelas; manter compatibilidade e criar estruturas novas
com backfill determinístico.

### Decisão

Preservar objetos legados, criar versão 1 publicada para cada plano, migrar
composição e preços positivos e ligar subscription à versão quando possível.

### Base oficial

Política local de migrations aditivas e Prisma Migrate.

### Consequências

Nenhum dado histórico é descartado. A coexistência é risco explícito até as
Etapas 04–07 migrarem os consumidores.

### Possível reversão futura

Deprecação dos campos legados apenas após telemetria, backfill completo e rollout
com gate humano.

## DEC-007 — Entitlement efetivo com política versionada

Data: 26/08/2026
Etapa: 04
Status: ACEITA

### Contexto

Ausência de entitlement era interpretada como acesso habilitado, mas converter
todos os clientes diretamente para deny-by-default quebraria compatibilidade.

### Opções avaliadas

Manter default-on oculto; negar todos imediatamente; versionar a política e
resolver cada origem com precedência explícita.

### Decisão

Organizações preexistentes usam política `v1` identificável e novas organizações
usam `v2` deny-by-default. A ordem é: bloqueio da organização, override, grant,
versão publicada da subscription, entitlement legado, compatibilidade `v1` e
negação `v2`.

### Base oficial

OWASP Authorization e contrato normativo de entitlements SoIZI.

### Consequências

Toda decisão expõe origem e motivo. Plano, role tenant e frontend deixam de ser
atalhos implícitos; a conversão de clientes pode ser gradual e auditável.

### Possível reversão futura

A política `v1` poderá ser removida somente após backfill, telemetria e prova de
que todas as organizações têm composição explícita.

## DEC-008 — Seats serializados por organização

Data: 26/08/2026
Etapa: 04
Status: ACEITA

### Contexto

Duas inclusões concorrentes poderiam ler o mesmo uso e ultrapassar o limite sem
erro. O contador deriva de múltiplas linhas, não de um único registro bloqueável.

### Opções avaliadas

Confiar em checagem prévia; contador materializado; transação serializable com
retry; advisory lock transacional por organização com recontagem.

### Decisão

Toda mutação que ocupa seat adquire `pg_advisory_xact_lock` por `organizationId`
e, em `ReadCommitted`, reconta memberships ativas e convites pendentes válidos
antes de escrever.

### Base oficial

PostgreSQL 16 — advisory locks, função `pg_advisory_xact_lock` e snapshots de
`ReadCommitted`; Prisma — interactive transactions e isolation level.

### Consequências

Operações participantes são serializadas por tenant, o lock é liberado no fim da
transação e o comando de contagem após a espera vê commits anteriores. Todo novo
writer de convite/membership deve reutilizar o mesmo serviço.

### Possível reversão futura

Um contador materializado poderá substituir a recontagem se mantiver atomicidade,
isolamento por tenant e a mesma prova concorrente.

## DEC-009 — Host Asaas derivado e produção com duplo gate

Data: 26/08/2026
Etapa: 05
Status: ACEITA

### Contexto

Uma base URL livre ou chave de ambiente incompatível pode enviar testes para o
provider real. A documentação oficial distingue hosts e prefixos de chave.

### Opções avaliadas

Aceitar `ASAAS_BASE_URL`; confiar apenas em `NODE_ENV`; derivar host de enum e
validar ambiente, prefixo e gate de produção.

### Decisão

`business.billing.environment` no registro global aceita somente
`sandbox|production`. O host continua constante interna. Chaves Sandbox e
Produção são valores separados, cifrados no banco e validados pelos prefixos
`$aact_hmlg_` e `$aact_prod_`. Produção exige simultaneamente
`NODE_ENV=production` e `business.billing.asaas.production_enabled=true`.
Parâmetros e token de webhook também são globais, cifrados quando sensíveis, e
podem ser sincronizados pela API oficial do Asaas.

### Base oficial

Asaas Authentication e Sandbox.

### Consequências

SSRF por host configurável e mistura acidental de credenciais são recusados antes
da rede. A flag não substitui o gate humano de rollout.

Revisão em 05/10/2026: credenciais, parâmetros e flags de ativação Asaas foram
migrados de variáveis de integração para o registro criptografado no banco. A
chave mestra `SECRET_ENCRYPTION_KEY` permanece em secret manager externo porque
guardá-la junto do ciphertext removeria a proteção em repouso.

### Possível reversão futura

Novos ambientes oficiais só podem ser adicionados após documentação oficial e
teste de contrato dedicado.

## DEC-010 — Customer mapping com claim local e reconciliação remota

Data: 26/08/2026
Etapa: 05
Status: ACEITA

### Contexto

O Asaas permite customers duplicados e não documenta o `POST /customers` como
idempotente. Timeout pode ocorrer depois da criação remota.

### Opções avaliadas

Retry automático; confiar apenas em `externalReference`; manter lease/estado
local e reconciliar por consulta antes e depois de resposta ambígua.

### Decisão

O banco concede um lease único por organização/provider. O writer consulta
`externalReference`, cria somente se ausente e, se o POST tiver resultado
desconhecido, consulta novamente antes de permitir nova tentativa.

### Base oficial

Asaas Create Customer, List Customers e Creating Customers.

### Consequências

Rede nunca ocorre dentro de transação longa; corrida local não duplica criação;
crash após criação pode ser recuperado pelo external reference. Mais de um
customer remoto com a mesma referência bloqueia reconciliação automática.

### Possível reversão futura

Se o endpoint passar a oferecer idempotency key oficialmente documentada, ela
pode ser adicionada preservando o claim e a reconciliação como defesa adicional.

## DEC-011 — Homologação Asaas diferida sem liberar produção

Data: 26/08/2026
Etapa: 05–12
Status: ACEITA

### Contexto

A chave do Asaas Sandbox ainda não existe. O protocolo determinístico bloqueava
a Etapa 05, mas o usuário determinou explicitamente concluir todas as etapas de
implementação antes de tratar as chaves.

### Opções avaliadas

Interromper toda a implantação; usar uma chave de produção; implementar com
contratos locais e transferir a homologação externa para o gate final.

### Decisão

Concluir as etapas 05–12 usando documentação oficial vigente, adapters isolados,
mocks, testes de contrato e PostgreSQL local. A ausência da chave permanece risco
aberto e a homologação completa no Sandbox é requisito obrigatório da Etapa 12.
Nenhuma chamada ou credencial de produção é autorizada.

### Base oficial

Decisão humana explícita de 26/08/2026, Asaas Sandbox e política normativa de
separação de ambientes.

### Consequências

Etapas podem avançar localmente sem alegação de validação externa. O rollout
financeiro continua bloqueado até a matriz Sandbox passar e ser documentada.

### Possível reversão futura

Assim que a chave Sandbox existir, executar imediatamente os verificadores sem
alterar o princípio de que produção exige gate humano próprio.

## DEC-012 — Inbox sanitizada antes do HTTP 200

Data: 27/08/2026
Etapa: 07
Status: ACEITA

### Contexto

O Asaas entrega ao menos uma vez, aceita somente HTTP 200 como sucesso e pode
adicionar campos. O payload financeiro completo pode conter PII desnecessária.

### Decisão

Autenticar primeiro, validar até 256 KiB, projetar somente IDs/status/valor/datas
necessários, persistir por event ID único e só então responder 200. O processador
usa claim/lease e transação; payload bruto e erro remoto bruto não são gravados.

### Consequências

Replay é determinístico e novos campos não quebram a fila. Investigações que
precisem do payload original usam os Webhook Logs oficiais durante a janela de
retenção, nunca uma cópia indiscriminada no banco SoIZI.

## DEC-013 — Administração por metadados e permissions independentes

Data: 27/08/2026
Etapa: 08
Status: ACEITA

### Contexto

Operadores internos precisam administrar identidade, acesso e cobrança sem que a
role de plataforma se transforme em leitura irrestrita do workspace do cliente.

### Decisão

As queries administrativas usam projeções allowlist e não selecionam conteúdo
do tenant. CPF/CNPJ aparece somente pelos quatro últimos dígitos já persistidos.
O detalhe é montado por seções, cada uma condicionada à permission específica;
ações mutáveis revalidam permission e destino no servidor.

### Consequências

Um `BILLING_ADMIN` acessa operações financeiras sem receber automaticamente
membros ou conteúdo. Um `CUSTOMER_ADMIN` administra o estado da organização sem
ganhar reconciliação. Suporte nesta etapa é somente metadata; acesso elevado ou
impersonação permanecem proibidos até o desenho de sessão privilegiada.

## DEC-014 — Benefício comercial por snapshot, sem reescrever catálogo

Data: 27/08/2026
Etapa: 09
Status: ACEITA

### Contexto

O catálogo publicado é imutável, o Asaas Checkout vigente não documenta um campo
de cupom e eventos financeiros precisam ser comparados ao valor contratado.

### Decisão

Cupom é resolvido em transação antes do checkout. O redemption persiste valor
original, desconto e valor final em centavos; a tentativa referencia esse
redemption e repete o valor final para validação de webhook/reconciliação.
Commercial grant é uma entidade agrupada consumida pelo resolvedor de
entitlements; override permanece separado e com maior precedência.

### Consequências

Preço e PlanVersion não mudam. Corrida é serializada por código e limitada por
constraints. Resultado remoto ambíguo não libera o cupom prematuramente. Desconto
financeiro e capability continuam domínios diferentes e auditáveis.

## DEC-015 — Ledger seletivo e agregado mensal UTC

Data: 27/08/2026
Etapa: 10
Status: ACEITA

### Contexto

Quotas de IA/API precisam de consumo autoritativo, deduplicação e reset. Tabelas,
ingredientes, seats e projetos já têm persistência própria e não justificam uma
segunda linha por microevento.

### Decisão

Persistir `UsageEvent` apenas para consumo medido e `UsageAggregate` para a soma
mensal UTC. A chave idempotente é única dentro do tenant. Advisory lock por
tenant/feature/período protege a borda da quota; entitlement e uso são relidos na
mesma transação. Outras métricas são contadas diretamente de tabelas autoritativas.

### Consequências

Repetição não duplica consumo, tenants não compartilham contador e trocar o mês
não exige zerar ou sobrescrever histórico. O browser não possui endpoint para
declarar quantidade. Custos e margem ficam ausentes enquanto não houver fonte
confiável, em vez de receber estimativa falsa.

## DEC-016 — Sessão privilegiada por permission, destino e browser

Data: 28/08/2026
Etapa: 11
Status: ACEITA

### Contexto

Uma role persistida comprova elegibilidade, mas não intenção recente nem escopo
para uma ação HIGH/CRITICAL. Um token global de elevação ampliaria o impacto de
sequestro de sessão e permitiria reutilização fora do destino revisado.

### Decisão

Ativação exige MFA não reutilizável, justificativa e duração de até 15 minutos.
A sessão cobre exatamente uma permission e um par target type/ID, e guarda apenas
o HMAC do cookie NextAuth atual. HIGH ativa após MFA; CRITICAL exige aprovação
por outro operador com `platform.security.operators.manage` e MFA próprio.

Suporte no MVP registra pedido privilegiado metadata-only. A sessão não libera
conteúdo do cliente e nenhum caminho de impersonation foi criado.

### Base oficial

NIST SP 800-63B, Microsoft Entra PIM, OWASP MFA/Authentication, RFC 6238,
NextAuth sessions e documentação oficial do otplib 13.

### Consequências

Alterar o ID, reutilizar o código, trocar de navegador, expirar ou revogar nega a
ação. Audit logs referenciam a sessão que autorizou a mutation. O maker não pode
aprovar o próprio pedido crítico e o banco preserva essa regra por constraint.
