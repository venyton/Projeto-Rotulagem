# Etapa 05 — Asaas Sandbox e adapter

## Estado

DONE

## Objetivo

Validar os contratos vigentes do Asaas Sandbox e implementar um adapter
server-only, tipado e idempotente, mantendo o domínio comercial independente do
provider.

## Primeira ação objetiva

Pesquisar a documentação oficial do Asaas para autenticação, ambientes,
clientes, cobranças, assinaturas, idempotência, erros, rate limit e webhooks;
depois inventariar somente a presença das credenciais Sandbox locais, sem exibir
segredos e sem acessar produção.

## Estado encontrado

Não havia configuração, código ou credencial Asaas. O schema preservava apenas
`STRIPE` e `MANUAL`; `BillingCustomer` exigia ID remoto imediatamente e não
representava claim, erro ou reconciliação de criação ambígua.

Inventário sem valores em 26/08/2026:

| Variável | Estado local |
| --- | --- |
| `ASAAS_ENV` | ausente |
| `ASAAS_API_KEY` | ausente |
| `ASAAS_WEBHOOK_AUTH_TOKEN` | ausente |
| `ASAAS_PRODUCTION_ENABLED` | ausente |

## Documentação oficial consultada

- Authentication e Sandbox;
- criação, listagem, consulta e remoção de customer;
- HTTP response codes e API limits;
- disponibilidade de testes no Sandbox;
- Webhooks apenas para fixar as fronteiras futuras de token e idempotência.

Fontes, datas, endpoints e decisões estão registradas em
`../FONTES_OFICIAIS.md`. Nenhum endpoint foi inferido.

## Implementação local concluída

- interface interna `BillingProvider`, sem tipos Asaas no domínio consumidor;
- configuração segura deriva o host exclusivamente de `sandbox|production`;
- chave Sandbox deve ter prefixo `$aact_hmlg_` e produção é recusada fora de
  runtime produtivo mais gate explícito;
- token de webhook, quando presente, exige 32–255 caracteres, sem espaços e
  diferente da API key;
- adapter server-only envia `access_token`, `User-Agent` identificável e JSON,
  nunca usa `Authorization: Bearer`;
- GET não recebe body; erros expõem somente códigos sanitizados;
- `429` preserva `RateLimit-Reset`; `5xx` e rede são classificados sem retry
  automático de POST;
- diagnóstico revela ambiente, host, alcance, latência e código seguro, nunca
  chave, payload ou PII;
- migration `20260826100000_add_asaas_customer_mapping` adiciona provider
  `ASAAS`, estado do mapping, lease e campos de reconciliação;
- mappings Stripe preexistentes são mantidos e backfilled como `ACTIVE`;
- criação idempotente local usa lease por organização/provider, busca remota por
  `externalReference` antes de criar e reconcilia POST ambíguo antes de qualquer
  nova tentativa;
- documento é validado e enviado apenas ao provider; o mapping local não o
  persiste nem o registra em auditoria;
- scripts seguros: `diagnose:asaas`, `verify:billing-mapping:runtime` e
  `verify:asaas:sandbox`.

## Validação concluída

- 13 testes de contrato local: config, headers, métodos, payload, erros, rate
  limit, duplicidade remota, POST ambíguo e diagnóstico;
- runtime local: duas chamadas concorrentes produziram uma única criação lógica,
  uma rejeição `IN_PROGRESS` e retry `local`;
- runtime local: falha ambígua foi resolvida como `remote_reconciled`;
- `npm run check`: 97/97 testes;
- `npm run security:check`: zero vulnerabilidades `moderate+`;
- migration limpa/upgrade: 44 tabelas, 24 enums e 26 migrations, sem drift;
- build: 35 páginas;
- `git diff --check`: aprovado.

## Homologação externa diferida

`npm run verify:asaas:sandbox` recusou corretamente a execução porque não existe
`ASAAS_API_KEY` Sandbox. Sem essa credencial ainda não é possível criar,
consultar, listar e remover o customer fictício no ambiente oficial.

Em 26/08/2026 o usuário decidiu explicitamente que todas as etapas devem ser
implementadas primeiro e que as chaves serão tratadas somente depois. Assim, o
gate desta etapa aprova o adapter no escopo local comprovado e transfere o teste
de contrato externo para a homologação final da Etapa 12. O código não foi
apontado para produção e nenhuma chamada Asaas foi realizada.

## Gate

`GATE: APROVADO`

Escopo aprovado: domínio, adapter, segurança, customer mapping, migrations,
contratos mockados e runtime local. Limitação explícita: homologação real no
Asaas Sandbox permanece pendente e é condição de go/no-go da Etapa 12.

## Próxima ação objetiva

Iniciar a Etapa 06 com Checkout hospedado recorrente, mantendo callback como UX e
estado financeiro dependente de webhook/reconciliação.

## Atualização — configuração persistida no banco (05/10/2026)

A implementação posterior substitui as variáveis `ASAAS_*` de integração por
definições globais em `ConfigurationDefinition`/`ConfigurationValue`. Ela
mantém chaves distintas para Sandbox e Produção, gate de Produção no banco mais
`NODE_ENV=production`, URL derivada de enum e cifra dos segredos no servidor.
Parâmetros de webhook (`name`, URL pública, e-mail, estado, interrupção,
`apiVersion`, token, `sendType`, eventos e ID por ambiente) também são persistidos
no registro; `POST /v3/webhooks` e `PUT /v3/webhooks/{id}` sincronizam o Asaas.

Os controles de ativação Asaas, checkout e processamento automático de eventos
foram movidos para o mesmo registro global. A edição exige
`platform.billing.configuration.manage`. A chave mestra `SECRET_ENCRYPTION_KEY`
continua externa ao banco. Migration revisada: `20261005130000_move_asaas_configuration_to_database`.
