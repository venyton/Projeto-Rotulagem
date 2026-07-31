
---
name: nextjs-fullstack-development
description: Use esta skill para criar, implementar, revisar, corrigir, testar, modernizar ou preparar para produção aplicações Next.js full-stack. Aplica-se a App Router ou Pages Router, React, TypeScript, Server Components, Server Actions, Route Handlers, APIs, banco de dados, autenticação, autorização, segurança, performance, acessibilidade, testes, Docker e CI/CD. Preserve projetos existentes e suas convenções. Não use para projetos sem Next.js nem para tarefas não relacionadas a código.
compatibility: Projetada para Codex CLI, IDE ou desktop trabalhando em repositórios com Node.js. Requer as ferramentas e credenciais já previstas pelo projeto; Git é recomendado.
metadata:
  version: "1.1.0"
  language: "pt-BR"
---
# Next.js Full-Stack Development

## Missão

Entregar software Next.js funcional e integrado, com qualidade de produção, usando a menor mudança correta, segura, testável e sustentável.
Produza implementação real, não apenas exemplos, pseudocódigo ou planos. Preserve o contexto do repositório e não imponha uma stack favorita sobre decisões existentes.

## Prioridade das instruções

Siga, nesta ordem:

1. pedido explícito do usuário;
2. `AGENTS.md` aplicável ao diretório;
3. documentação interna;
4. código, testes, configurações e lockfile;
5. documentação oficial compatível com as versões instaladas.
   Quando houver conflito técnico, priorize: segurança e integridade de dados, requisito do produto, compatibilidade, correção, manutenibilidade, acessibilidade, performance e simplicidade.

## Regras inegociáveis

- Leia o repositório antes de editar.
- Preserve arquitetura e convenções coerentes.
- Preserve o gerenciador de pacotes definido pelo lockfile e pelo campo `packageManager`.
- Não misture `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock` ou `bun.lock`.
- Não altere infraestrutura, CI, Docker, manifests ou versões importantes fora do escopo.
- Não sobrescreva mudanças preexistentes do usuário.
- Não faça commit, push, reset, checkout destrutivo ou migration destrutiva sem autorização.
- Não use hardcode para segredos, URLs, tenants, usuários, permissões, preços ou regras configuráveis.
- Use TypeScript estrito; evite `any`, casts injustificados e erros ignorados.
- Valide toda entrada externa no servidor.
- Autorize toda operação sensível no ponto em que ela executa.
- Nunca confie em IDs, roles, tenant, preço ou permissão enviados pelo cliente.
- Não exponha segredos, stack traces, SQL, tokens, cookies ou dados sensíveis.
- Não declare sucesso sem executar as verificações disponíveis.

# Fluxo de execução

## 1. Descobrir

Antes de implementar:

- execute `git status` e preserve mudanças existentes;
- localize `AGENTS.md`, `README`, docs e instruções;
- leia `package.json`, scripts, lockfile, `tsconfig`, config do Next, ESLint e env example;
- identifique e preserve o gerenciador de pacotes real do projeto;
- identifique versões de Next.js, React, TypeScript e Node;
- identifique App Router, Pages Router ou modo híbrido;
- localize padrões semelhantes, componentes compartilhados, schemas, serviços e testes;
- identifique autenticação, ORM, banco, cache, filas, observabilidade e estratégia de estilos;
- se houver `components.json`, uso de shadcn/ui ou tarefa relacionada à interface, aplique também a skill `shadcn` instalada no repositório;
- determine quais arquivos e contratos serão afetados.
  Não suponha sintaxe, cache ou comportamento de outra versão do Next.js.

## 2. Delimitar

Defina internamente:

- comportamento atual e esperado;
- causa provável ou regra de negócio;
- menor fatia vertical capaz de funcionar de ponta a ponta;
- riscos de regressão, segurança, cache, dados e deploy;
- verificações necessárias.
  Para tarefas amplas, conclua uma fatia vertical por vez: schema/migration, dados, regra, interface HTTP/action, UI e testes.

## 3. Implementar

- siga padrões existentes;
- reutilize código e componentes adequados;
- mantenha fronteiras claras entre UI, aplicação, domínio e infraestrutura;
- trate loading, vazio, erro, sucesso e ausência de permissão;
- faça mudanças focadas;
- adicione testes próximos ao comportamento alterado;
- documente apenas contratos e decisões que realmente mudaram.

## 4. Verificar

Revise o diff e execute, quando disponíveis:

1. formatação do projeto;
2. lint;
3. typecheck;
4. testes focados;
5. suíte relevante;
6. build de produção;
7. migrations ou geração do ORM;
8. validação manual do fluxo, console, rede, responsividade e teclado.
   Diferencie falhas preexistentes de regressões novas. Nunca esconda uma falha com `|| true`, `--force`, regra desativada ou cast.

## 5. Relatar

A resposta final deve informar objetivamente:

- o que foi alterado;
- decisões relevantes;
- comandos executados e resultados;
- o que não pôde ser verificado e o risco restante.

# Projetos novos

Quando não houver stack definida, use defaults conservadores:

- Next.js estável compatível com o ambiente;
- App Router;
- React suportado pela versão do Next.js;
- TypeScript estrito;
- ESLint CLI com `eslint-config-next/core-web-vitals` e regras TypeScript;
- Server Components por padrão;
- schema validation com Zod ou equivalente;
- Vitest ou Jest para unitários, Testing Library quando necessária e Playwright para E2E crítico;
- biblioteca madura de autenticação;
- preserve o package manager identificado pelo lockfile e pelo campo `packageManager`;
- em projeto novo sem gerenciador definido, escolha apenas um e não misture lockfiles.
  Instale somente dependências necessárias. Não adicione ORM, state manager, form library, UI kit, cache client ou observabilidade sem demanda real.
  Scripts recomendados, adaptados à versão e ao package manager:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "check": "eslint . && tsc --noEmit && vitest run && next build"
  }
}
```

Não use `next lint` em versões nas quais foi removido.

# Arquitetura

## Organização

Organize por domínio e responsabilidade sem camadas cerimoniais. Deve ser evidente:

- onde a entrada é validada;
- onde autenticação e autorização acontecem;
- onde vive a regra de negócio;
- onde os dados são acessados;
- qual código pode chegar ao cliente;
- como erros e resultados são modelados;
- como o comportamento é testado.
  Estrutura de referência para projetos novos:

```text
src/
├── app/                 # rotas, layouts, handlers e boundaries
├── features/            # domínios: actions, services, data, schemas, UI
├── components/ui/       # primitives reutilizáveis
├── components/shared/   # composição entre domínios
├── lib/                 # auth, db, env, errors, security, observability
└── styles/
```

Reduza pastas em aplicações pequenas. Em aplicações grandes, evite pastas globais gigantes de `services`, `types` e `utils`.

## Dependências

Prefira a direção:

```text
UI -> aplicação/domínio -> acesso a dados -> infraestrutura
```

Evite componentes importando detalhes do ORM, serviços importando React, Client Components acessando banco ou módulos compartilhados vazando APIs server-only.

## Server e Client Components

- Use Server Components por padrão.
- Adicione `'use client'` somente ao menor componente que precisa de estado, efeitos, eventos, hooks client-side ou APIs do navegador.
- Não transforme página ou layout inteiro em cliente por uma interação localizada.
- Use `server-only` para módulos com banco, filesystem, segredos ou credenciais quando útil.
- Passe ao cliente apenas dados serializáveis e mínimos.

# App Router, renderização e navegação

- Escolha renderização estática, dinâmica ou cliente pelo requisito de frescor, personalização e interatividade.
- Não chame uma API interna da própria aplicação a partir de Server Component quando puder chamar diretamente serviço ou camada de dados.
- Use `Suspense` e streaming em partes realmente independentes e lentas.
- Evite um único loading que bloqueie a página inteira.
- Use skeletons estáveis para evitar layout shift.
- Mantenha layouts focados no que é compartilhado.
- Use route groups para organização, não para mudar URL.
- Use `not-found`, error boundaries, redirects e status HTTP corretos.
- Detecte a versão antes de usar `cookies`, `headers`, `params`, `searchParams`, `middleware` ou `proxy`.
- Não introduza APIs experimentais em produção sem solicitação, avaliação de risco e fallback.

# Dados, cache e revalidação

Toda leitura deve ter expectativa de consistência definida: sempre atualizada, cacheada por tempo, cacheada até invalidação, estática por build, personalizada ou deduplicada por render.

## Fetch e integrações

- verifique `response.ok`;
- use timeout/cancelamento quando necessário;
- valide resposta externa como `unknown`;
- normalize erros;
- não registre tokens ou payloads sensíveis;
- escolha cache e revalidação conscientemente;
- aplique retry somente em operações seguras e idempotentes.

## Banco

Em código servidor, prefira acesso direto à camada de dados em vez de HTTP interno. Centralize cliente, transações, filtros de tenant, seleção de campos, mapeamento de erros e instrumentação.

## Cache

Primeiro identifique se o projeto usa Cache Components, modelo anterior de cache, cache externo ou plataforma distribuída.

- não misture modelos sem entender o impacto;
- não cacheie dados privados com chave compartilhada;
- use tags específicas e nomes consistentes;
- documente expectativa de frescor quando não for óbvia;
- considere múltiplas instâncias;
- invalide somente após persistência confirmada;
- prefira tag ou caminho específico a refresh global;
- não use `no-store` em tudo por padrão.

## Paralelismo

- inicie leituras independentes antes de aguardá-las;
- use `Promise.all` no servidor para operações independentes;
- evite waterfalls;
- não dispare múltiplas Server Actions do cliente para simular leitura paralela;
- use uma ação coordenadora ou Route Handler quando necessário.

# Mutações e interfaces HTTP

## Escolha

Use Server Action para formulários e mutações fortemente ligadas à UI do App Router. Use Route Handler para API pública, cliente externo, webhook, callback, upload/download, leitura client-side ou controle HTTP explícito.
A regra de negócio deve viver em serviço/função testável, não exclusivamente na transport layer.

## Pipeline obrigatório

1. obtenha identidade de sessão, cookie ou header confiável;
2. valide params, query e body;
3. verifique autorização, propriedade e tenant;
4. execute regra de negócio;
5. use transação para invariantes atômicos;
6. registre auditoria quando exigida;
7. revalide cache após sucesso;
8. retorne resultado serializável, mínimo e seguro.

## Contrato de resultado

Prefira union discriminada para erros esperados:

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string[]> }
```

Lance exceção para falhas inesperadas; registre detalhes no servidor e mostre mensagem segura.

## Idempotência

Use chave idempotente, constraint única ou registro transacional em pagamentos, pedidos, provisionamento, webhooks, notificações, jobs e qualquer operação sujeita a retry ou duplo clique.

# Banco de dados e domínio

- Preserve o ORM existente; não substitua por preferência.
- Modele nulabilidade e relacionamentos conscientemente.
- Use constraints para invariantes e índices baseados em consultas reais.
- Selecione somente campos necessários e evite N+1.
- Use transações para operações atômicas.
- Não retorne entidade completa do ORM ao cliente; use seleção ou DTO.
- Versione migrations; não use sincronização direta como substituto de migrations de produção.
- Planeje rollout para alterações destrutivas ou incompatíveis.
- Trate concorrência, retenção, exclusão e auditoria quando relevantes.

## Multi-tenancy

- derive tenant da sessão ou contexto confiável;
- nunca aceite `tenantId` do cliente como autorização;
- filtre tenant em toda leitura e mutação;
- inclua tenant em constraints e índices quando necessário;
- isole chaves de cache;
- teste acesso cruzado;
- audite operações administrativas.

# Autenticação e autorização

- Use biblioteca madura para hashing, sessão, OAuth/OIDC, MFA e recuperação de senha.
- Use cookies `HttpOnly`, `Secure` em produção e `SameSite` apropriado.
- Defina expiração, rotação e invalidação de sessão.
- Não passe token de autenticação como argumento de Server Action se ele pode vir da sessão.
- Diferencie autenticação de autorização.
- Autorize por propriedade, tenant, papel, permissão, política contextual e estado do recurso.
- Centralize políticas quando comparações de role começarem a se espalhar.
- `proxy.ts` ou `middleware.ts` melhora UX, mas nunca substitui autorização na operação sensível.

# Validação, erros e contratos

Valide nos limites: formulários, route params, query, body, headers, env, APIs, webhooks e arquivos.

- derive tipos de schemas quando possível;
- separe inputs de criação, atualização e resposta;
- normalize strings, números e datas;
- limite tamanho de payload;
- evite coerções ambíguas;
- diferencie validação, 401, 403, 404, 409, 422, 429, indisponibilidade externa e erro interno;
- use códigos de erro estáveis quando houver consumidor programático;
- associe erros de formulário aos campos e anuncie-os de forma acessível;
- não use apenas toast para erro que bloqueia formulário complexo.

## Integração com shadcn/ui

Quando o projeto possuir `components.json`, componentes shadcn/ui ou quando a tarefa envolver interface:

- aplique também a skill oficial `shadcn`;
- caso ela não seja carregada automaticamente, consulte `.agents/skills/shadcn/SKILL.md`;
- use a skill oficial para CLI, componentes, registries, presets, Base UI, Radix e padrões específicos do shadcn;
- use esta skill para arquitetura Next.js, fronteiras server/client, dados, segurança, autenticação, testes e integração full-stack;
- execute `shadcn info --json` quando precisar confirmar a configuração real do projeto;
- preserve tokens, temas, componentes modificados e convenções existentes;
- verifique o diff antes de atualizar ou reinstalar componentes;
- não use `--overwrite` sem analisar os arquivos que seriam substituídos;
- não adicione componentes preventivamente;
- mantenha `components/ui` para primitives do design system;
- mantenha componentes de domínio próximos às respectivas features;
- não presuma Radix ou Base UI: confirme pela configuração instalada;
- não migre entre Radix e Base UI sem solicitação explícita;
- prefira tokens semânticos a cores hardcoded;
- preserve compatibilidade com temas claro e escuro;
- mantenha Server Components por padrão e limite `'use client'` ao menor componente interativo.

# Interface e estilos

Antes de criar UI, identifique tokens, componentes, ícones, padrões de formulário, tema e solução CSS existentes.

- reutilize design system;
- não misture Tailwind, CSS Modules, CSS-in-JS e UI kits sem justificativa;
- prefira composição a dezenas de props booleanas;
- mantenha estado próximo de onde é usado;
- não abstraia componente sem ganho de leitura, teste ou reutilização;
- use HTML semântico;
- trate `hover`, `focus-visible`, `disabled`, `invalid`, loading e reduced motion;
- use tokens em vez de valores repetidos;
- evite `!important` e especificidade excessiva;
- teste breakpoints, zoom e fontes maiores.

## Formulários

Todo formulário relevante deve ter:

- labels reais e descrição quando necessária;
- valores iniciais coerentes;
- validação cliente para feedback e servidor como fonte de verdade;
- pending/disabled;
- prevenção de submissão duplicada;
- preservação dos dados após erro;
- erros por campo e geral;
- confirmação em ação destrutiva;
- foco no primeiro erro quando apropriado.
  Não adicione form library para um formulário simples; use-a quando a complexidade justificar.

# Acessibilidade

Use WCAG 2.2 AA como referência, salvo requisito diferente.
Verifique:

- HTML semântico e headings;
- navegação por teclado;
- foco visível, trap e retorno em dialogs;
- labels e nomes acessíveis;
- contraste;
- erros anunciados;
- tabelas com headers;
- `alt` adequado;
- ícones decorativos ocultos;
- touch targets;
- reduced motion;
- informação não dependente apenas de cor.
  Prefira HTML nativo a ARIA. Teste teclado manualmente e automação de acessibilidade nos fluxos críticos quando possível.

# Performance

Priorize, nesta ordem:

1. reduzir JavaScript cliente;
2. eliminar waterfalls;
3. corrigir consultas e integrações lentas;
4. melhorar LCP, INP e CLS;
5. aplicar cache seguro;
6. otimizar imagens e fontes;
7. dividir bundles grandes;
8. remover dependências pesadas.

- use Server Components;
- importe módulos de forma granular;
- use dynamic import para conteúdo pesado não inicial;
- execute bundle analyzer quando houver evidência de bundle excessivo;
- use `next/image` com dimensões, `sizes` e prioridade corretos;
- configure origens remotas de imagem de forma restritiva;
- use `next/font` quando compatível e limite famílias/pesos;
- pagine dados, selecione colunas e indexe consultas reais;
- compare antes/depois quando a tarefa for otimização.

# SEO e metadata

Para conteúdo público indexável:

- use Metadata API;
- defina título e descrição específicos;
- configure canonical, Open Graph e cards quando necessários;
- gere sitemap e robots coerentes;
- use dados estruturados somente se verdadeiros;
- preserve URLs e redirects;
- entregue conteúdo essencial sem depender apenas de JavaScript cliente.
  Não aplique SEO artificial a dashboards privados.

# Segurança

## Segredos e env

- nunca comite segredos;
- tudo com `NEXT_PUBLIC_` é público;
- mantenha segredos em módulos server-only;
- valide env na inicialização;
- atualize `.env.example` apenas com nomes e exemplos seguros;
- não use fallback inseguro de segredo em produção.

## XSS, CSP e headers

- evite `dangerouslySetInnerHTML`;
- sanitize HTML ou Markdown não confiável;
- configure CSP compatível com o framework e origens mínimas;
- considere HSTS, nosniff, Referrer-Policy, Permissions-Policy e proteção contra framing;
- não copie política genérica que quebre o app ou permita `*` desnecessário.

## CSRF, CORS e origem

- mantenha cookies e origem corretos;
- não amplie `allowedOrigins` sem necessidade;
- valide assinatura/timestamp de webhook;
- não trate CORS como autenticação.

## SSRF e uploads

Para URL fornecida pelo usuário: valide protocolo, use allowlist, bloqueie redes privadas/metadados, limite redirects, timeout e tamanho, e não repasse headers sensíveis.
Para upload: valide MIME real, extensão e tamanho; gere nome seguro; proteja contra path traversal; use storage privado/URL assinada; nunca execute arquivo enviado; faça varredura quando o risco justificar.

## Abuso e dependências

- aplique rate limit em login, recuperação, cadastro, busca cara, upload, email/SMS e APIs públicas;
- use armazenamento distribuído quando houver múltiplas instâncias;
- instale pacotes mantidos, necessários e compatíveis;
- não aplique atualização major ou audit fix com `--force` cegamente;
- remova dependências não usadas.

# Integrações e webhooks

Encapsule cada API externa em adaptador que trate autenticação, URL, timeout, validação, paginação, rate limit, erros, retry seguro, logs e idempotência.
Para webhooks:

1. preserve body bruto se necessário;
2. valide assinatura e timestamp;
3. bloqueie replay quando possível;
4. registre evento com chave única;
5. responda rapidamente;
6. processe trabalho pesado fora da requisição quando houver infraestrutura;
7. mantenha processamento idempotente;
8. monitore falhas e retries.

# Observabilidade

Use logs estruturados com request/trace ID, ação, recurso, resultado, latência e identificadores não sensíveis.
Nunca registre senha, token, cookie, cartão, documento completo ou payload sensível.
Para fluxos críticos, considere erros agrupados, métricas de sucesso, latência, integração, fila, cache, consulta, Core Web Vitals e métricas de negócio. Respeite privacidade e consentimento.

# Testes

Use o teste mais barato que prove o comportamento:

- regras e funções puras: unitário;
- banco, serviços e handlers: integração;
- componente interativo: Testing Library;
- jornada crítica: Playwright.
  Adicione ou atualize testes para regra de negócio, autorização, tenant, validação, cálculos, contratos e bugs corrigidos. Uma correção deve ter teste que falharia antes, quando viável.

## Qualidade dos testes

- teste comportamento observável, não internals do framework;
- evite mocks excessivos;
- use factories;
- congele tempo quando necessário;
- mantenha testes determinísticos e independentes;
- use banco isolado, migrations reais e limpeza entre integrações;
- consulte componentes por role, label e nome acessível;
- mantenha E2E isolado, com trace/screenshot em falha e sem dependência de ordem.

# Lint, tipos e formatação

- preserve ESLint/Prettier/Biome existentes;
- para projeto moderno, use ESLint CLI e config Next compatível;
- não introduza formatador em tarefa alheia;
- não faça reformatação global;
- desative regra somente no menor escopo e com motivo real;
- não desative regras de hooks para contornar modelagem;
- mantenha script explícito de typecheck;
- diferencie erros preexistentes de erros introduzidos.

# Docker, CI e deploy

Não altere infraestrutura sem escopo ou autorização.
Quando solicitado, Docker de produção deve usar multi-stage, lockfile congelado, usuário não-root, `.dockerignore`, nenhum segredo na imagem e somente artefatos necessários. Use output standalone apenas após confirmar configuração, runtime, dependências nativas e plataforma.
Pipeline de PR deve, conforme aplicável, executar instalação congelada, lint, typecheck, testes, build, E2E crítico e análise de segurança. Use cache, cancelamento de pipelines obsoletos e paralelismo sem esconder falhas.
Antes do deploy:

- valide env;
- execute migrations com estratégia segura;
- mantenha compatibilidade código/schema durante rollout;
- defina rollback;
- valide health/readiness;
- considere cache distribuído e múltiplas instâncias;
- confirme observabilidade.

# Git

- preserve working tree e alterações do usuário;
- revise `git diff` ao final;
- não inclua arquivos gerados, segredos ou mudança de lockfile sem motivo;
- mantenha diff focado;
- não misture refatoração não relacionada;
- quando solicitado a commitar, use commits coerentes e siga a convenção real do projeto.

# Migrações e modernização

Não atualize Next.js apenas porque há versão nova.
Quando upgrade for objetivo:

1. leia guia oficial da versão instalada até a alvo;
2. confirme Node suportado;
3. atualize em etapas em saltos grandes;
4. use codemods oficiais e revise o diff;
5. trate breaking changes;
6. valide lint, tipos, testes, build, cache, cookies, headers, routing e dependências.
   Para Pages Router -> App Router, prefira migração incremental, preserve URLs/SEO, migre data fetching conscientemente, reduza `'use client'` e não duplique API Route e Route Handler para o mesmo endpoint.
   Refatore somente para remover risco, duplicação prejudicial, acoplamento, falta de teste ou gargalo real.

# Diagnóstico de bugs

1. reproduza;
2. registre evidência mínima;
3. encontre o primeiro ponto em que o estado diverge;
4. trace entrada, transformação, persistência e saída;
5. formule e teste hipótese específica;
6. aplique correção mínima;
7. adicione teste de regressão;
8. execute verificações relacionadas.
   Investigue console, network, logs, fronteira server/client, serialização, cache, sessão, validação, query, env, runtime e diferenças entre dev/build/produção.
   Para bug apenas em produção, verifique env de build/runtime, case sensitivity, filesystem, múltiplas instâncias, CDN/proxy, cookies, runtime, dependências nativas, migrations, timeout e payload.

# Eficiência do agente

- leia primeiro instruções, árvore, manifests, arquivos relacionados, análogos e testes;
- expanda a busca somente por dependência real;
- use busca textual para símbolos e padrões;
- execute teste focado antes da suíte completa;
- consulte documentação oficial para API sensível à versão;
- não instale ferramenta auxiliar quando o projeto ou shell já resolve;
- implemente sem pedir confirmação quando o requisito estiver claro;
- peça orientação somente quando a ambiguidade muda materialmente produto, segurança ou dados.
  Evite arquivos vazios, abstrações futuras, bibliotecas desnecessárias, documentação inflada, testes redundantes, formatação global, upgrades oportunistas e reconstrução de infraestrutura estabelecida.

# Anti-padrões proibidos

Não faça sem justificativa explícita:

- `'use client'` no layout raiz;
- HTTP interno desnecessário no servidor;
- autorização somente em UI, middleware ou proxy;
- confiança em ID, tenant, role ou preço do cliente;
- entidade completa do banco enviada ao cliente;
- `any`, cast ou `catch {}` para esconder problema;
- segredo ou dado sensível em log;
- HTML não sanitizado;
- `useEffect` para estado derivável na renderização;
- estado servidor duplicado no cliente sem necessidade;
- invalidação global ou `no-store` indiscriminado;
- endpoint interno para cada Server Component;
- migration destrutiva sem rollout;
- dependência pesada para função trivial;
- stack substituída por preferência;
- lint ou TypeScript globalmente desativado;
- infraestrutura alterada fora do escopo;
- afirmação de teste não executado.

# Definição de pronto

Considere a tarefa pronta somente quando:

- o fluxo funciona de ponta a ponta;
- contratos entre UI, servidor e banco são coerentes;
- não há mock ou hardcode indevido em produção;
- validação e autorização estão no servidor;
- tenant, cache e dados mantêm isolamento e consistência;
- loading, vazio, erro, sucesso e permissão foram tratados quando aplicáveis;
- responsividade, teclado, foco e semântica foram considerados;
- testes relevantes foram adicionados ou atualizados;
- lint, typecheck, testes e build foram executados quando disponíveis;
- o diff foi revisado e mudanças do usuário foram preservadas;
- qualquer limitação restante foi declarada com precisão.

# Formato da resposta final

Use, quando aplicável:

```text
Implementado
- mudança principal;
- integração, proteção ou teste relevante.
Validação
- comando: resultado;
- comando: resultado;
- não executado: motivo e risco.
Observações
- somente decisões ou limitações importantes.
```

Não despeje arquivos inteiros já modificados. Não diga “deve funcionar”; diga o que foi efetivamente verificado.
