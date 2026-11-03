# Arquitetura, renderização e roteamento

Leia esta referência ao criar projetos, reorganizar módulos ou alterar App Router,
Pages Router, layouts, renderização, navegação ou fronteiras server/client.

## Organização

Organize por domínio e responsabilidade sem camadas cerimoniais. Deve ser claro
onde entrada, autorização, regra de negócio, dados, erros e testes vivem.

Estrutura de referência para projetos novos:

```text
src/
├── app/                 # rotas, layouts, handlers e boundaries
├── features/            # domínio: actions, services, data, schemas e UI
├── components/ui/       # primitives do design system
├── components/shared/   # composição entre domínios
├── lib/                 # auth, db, env, errors e observabilidade
└── styles/
```

Reduza pastas em aplicações pequenas. Evite diretórios globais gigantes de
`services`, `types` ou `utils`. Preserve a direção `UI -> aplicação/domínio ->
dados -> infraestrutura`: componentes não importam ORM, serviços não importam
React e código cliente não acessa módulos server-only.

## Server e Client Components

- Use Server Components por padrão.
- Restrinja `'use client'` ao menor componente que precisa de estado, efeitos,
  eventos, hooks client-side ou APIs do navegador.
- Use `server-only` em módulos com banco, filesystem, segredos ou credenciais.
- Passe ao cliente somente dados mínimos e serializáveis.
- Não faça HTTP interno em Server Components quando puder chamar diretamente a
  camada de serviço ou dados.

## App Router e renderização

Escolha renderização estática, dinâmica ou cliente conforme frescor,
personalização e interatividade. Defina boundaries de loading, erro e not-found
próximas do fluxo afetado; use `Suspense` e streaming apenas para partes lentas e
independentes, com skeleton estável.

Use route groups para organização, layouts apenas para conteúdo compartilhado e
redirects/status HTTP coerentes. Confirme a versão instalada antes de usar APIs
sensíveis à versão, como `cookies`, `headers`, `params`, `searchParams`,
`middleware`, `proxy` ou Cache Components. Não introduza API experimental em
produção sem solicitação, risco avaliado e fallback.

## Projetos novos

Quando não houver stack definida, prefira Next.js estável compatível com o
ambiente, App Router, TypeScript estrito, Server Components, schema validation e
ferramentas maduras para autenticação e testes. Preserve o package manager real;
se não existir, escolha um só. Não adicione ORM, state manager, form library, UI
kit, cache ou observabilidade sem necessidade concreta.

Use ESLint CLI em versões nas quais `next lint` foi removido. Adapte scripts e
dependências à versão efetivamente instalada, nunca à memória do agente.
