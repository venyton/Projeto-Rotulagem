# Dados, domínio e interfaces HTTP

Leia esta referência ao trabalhar com fetching, cache, Server Actions, Route
Handlers, banco, Prisma, regras de negócio, transações ou multi-tenancy.

## Leituras e cache

Defina a expectativa de consistência de cada leitura: atualizada, cacheada por
tempo, cacheada até invalidação, estática por build, personalizada ou somente
deduplicada durante a renderização.

- Verifique `response.ok`, aplique timeout/cancelamento quando necessário e
  valide respostas externas como `unknown`.
- Use retry somente em operações seguras e idempotentes.
- Em código servidor, prefira acesso direto à camada de dados a HTTP interno.
- Centralize cliente de banco, transações, filtros de tenant, seleção de campos,
  erros e instrumentação.
- Não misture modelos de cache nem cacheie dados privados com chave compartilhada.
- Invalide somente após persistência confirmada e prefira tags/caminhos
  específicos a refresh global.
- Considere múltiplas instâncias; não use `no-store` indiscriminadamente.
- Inicie leituras independentes antes de aguardá-las e evite waterfalls.

## Mutações

Use Server Action para mutações ligadas à UI do App Router. Use Route Handler
para API pública, cliente externo, webhook, callback, upload/download, leitura
client-side ou controle HTTP explícito. A regra de negócio deve permanecer em
serviço/função testável, não na transport layer.

Pipeline de mutação:

1. obtenha identidade de sessão ou header confiável;
2. valide params, query e body;
3. autorize recurso, propriedade e tenant;
4. execute a regra de negócio;
5. use transação para invariantes atômicos;
6. registre auditoria quando exigida;
7. revalide cache após o sucesso;
8. retorne resultado mínimo, seguro e serializável.

Modele erros esperados com union discriminada e códigos estáveis. Lance exceção
para falha inesperada, registre detalhes somente no servidor e apresente mensagem
segura. Use chave idempotente, constraint única ou registro transacional em
operações sujeitas a retry, webhook ou duplo clique.

## Banco e domínio

Preserve o ORM existente. Modele nulabilidade e relacionamentos conscientemente,
use constraints para invariantes, índices para consultas reais, seleção mínima
de campos e transações para atomicidade. Não devolva entidade completa do ORM ao
cliente; use seleção ou DTO. Versione migrations e planeje rollout para mudanças
destrutivas ou incompatíveis; sincronização direta não substitui migration de
produção.

## Multi-tenancy

Derive o tenant da sessão ou contexto confiável. Nunca aceite `tenantId` do
cliente como autorização. Aplique o filtro em toda leitura e mutação, inclua o
tenant em constraints/índices quando necessário, isole chaves de cache e teste
acesso cruzado. Operações administrativas relevantes devem ser auditáveis.
