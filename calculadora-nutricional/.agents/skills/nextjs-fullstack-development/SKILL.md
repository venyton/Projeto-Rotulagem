---
name: nextjs-fullstack-development
description: Use para trabalho Next.js full-stack que envolva arquitetura, App Router ou Pages Router, fronteiras Server/Client Components, dados e cache, Server Actions, Route Handlers, banco, autenticação, integrações, testes, build ou deploy. Não use para mudança puramente visual, estilo ou composição de componentes coberta pela skill shadcn, salvo quando também houver impacto full-stack.
metadata:
  version: "1.2.0"
  language: "pt-BR"
---

# Next.js Full-Stack Development

Entregue a menor mudança Next.js que resolva o fluxo de ponta a ponta, preservando
arquitetura, convenções, dados e trabalho preexistente. Implemente código real;
não imponha uma stack favorita nem amplie o escopo do usuário.

## Quando aplicar

Use esta skill quando a tarefa tocar pelo menos um destes pontos:

- rotas, layouts, renderização, navegação ou boundaries do Next.js;
- Server/Client Components, Actions, Route Handlers ou APIs;
- fetching, cache, revalidação, banco, Prisma ou regra de negócio;
- autenticação, autorização, tenant, integrações ou observabilidade;
- testes, performance, build, Docker, CI/CD, deploy ou upgrade do Next.js.

Não a carregue para alteração exclusivamente visual, CSS, conteúdo ou composição
de primitives shadcn. Nesses casos, use a skill shadcn e as referências visuais
exigidas pelo `AGENTS.md`. Quando uma tela também alterar dados, ações, rotas,
autorização ou fronteiras server/client, combine as duas skills.

## Prioridade e contexto

Siga pedido do usuário, `AGENTS.md`, documentação interna, código/configurações e
documentação oficial compatível com as versões instaladas. Em conflito técnico,
priorize integridade e segurança, requisito do produto, compatibilidade,
correção, manutenção, acessibilidade, performance e simplicidade.

Antes de editar:

1. confirme raiz, branch e `git status` e preserve mudanças existentes;
2. leia instruções, manifests, lockfile, configs e arquivos relacionados;
3. identifique versões, router, package manager, padrões análogos e testes;
4. delimite comportamento atual/esperado, contratos afetados, riscos e checks;
5. leia somente as referências abaixo que correspondam à tarefa.

Não suponha sintaxe ou comportamento de outra versão do Next.js. Consulte fonte
oficial quando uma API for sensível à versão.

## Invariantes

- Preserve package manager, lockfile, arquitetura e convenções coerentes.
- Não altere infraestrutura, CI, Docker ou versões importantes fora do escopo.
- Não sobrescreva alterações do usuário nem execute commit, push, reset ou
  migration destrutiva sem autorização.
- Use TypeScript estrito; não esconda falhas com `any`, casts ou erros ignorados.
- Valide toda entrada externa e autorize operações sensíveis no servidor.
- Nunca confie em ID, role, tenant, preço ou permissão enviados pelo cliente.
- Mantenha banco, filesystem, segredos e credenciais em módulos server-only.
- Use Server Components por padrão e restrinja `'use client'` ao menor limite
  interativo.
- Não exponha segredos, tokens, cookies, SQL, stack traces ou dados sensíveis.
- Não declare sucesso sem informar as verificações realmente executadas.

## Roteamento das referências

Leia apenas o necessário:

| Assunto da tarefa | Referência obrigatória |
| --- | --- |
| Arquitetura, projeto novo, App/Pages Router, layouts, renderização ou Server/Client Components | [architecture-routing.md](references/architecture-routing.md) |
| Fetching, cache, Actions, Route Handlers, banco, Prisma, domínio ou multi-tenancy | [data-domain-http.md](references/data-domain-http.md) |
| Autenticação, autorização, validação, segurança, uploads, APIs externas, webhooks ou observabilidade | [auth-security-integrations.md](references/auth-security-integrations.md) |
| Interface com impacto full-stack, formulários, acessibilidade, performance ou SEO | [frontend-quality.md](references/frontend-quality.md) |
| Testes, lint, diagnóstico, build, Docker, CI/CD, deploy, migration ou upgrade | [testing-operations.md](references/testing-operations.md) |

Se a tarefa cobrir mais de uma área, leia as referências correspondentes. Não
carregue todas por padrão. Para auditoria ou hardening dedicado, aplique também a
skill de segurança; para shadcn, aplique também a skill shadcn.

## Implementação

- Faça a menor fatia vertical que funcione: dados, regra, transporte, UI e testes
  apenas quando cada parte for necessária.
- Reutilize serviços, schemas, componentes e padrões existentes.
- Separe UI, aplicação/domínio, acesso a dados e infraestrutura sem criar camadas
  cerimoniais.
- Trate loading, vazio, erro, sucesso e ausência de permissão quando aplicáveis.
- Mantenha contratos serializáveis, erros seguros e cache coerente após mutações.
- Adicione ou atualize testes próximos ao comportamento alterado quando viável.
- Documente somente contrato ou decisão que realmente mudou.

## Verificação

Revise o diff e execute os checks proporcionais ao risco, usando os scripts reais
do projeto. Em geral, avance de formatação/lint e typecheck para testes focados,
suíte relevante, build, geração/migrations do ORM e validação manual do fluxo.

Não esconda falhas com `|| true`, `--force`, regra desativada ou cast. Diferencie
regressões novas de problemas preexistentes e não apresente validação estática
como prova de produção.

## Definição de pronto e handoff

Considere pronto quando o fluxo solicitado funciona, contratos são coerentes,
validação/autorização estão no servidor, tenant e cache permanecem isolados,
estados relevantes foram tratados, testes/checks proporcionais foram executados
e o diff preserva o trabalho do usuário.

No handoff, informe de forma objetiva:

- mudança e decisões relevantes;
- comandos executados e resultados;
- verificações não executadas, motivo e risco residual;
- dependências de ambiente ou integração externa.

Não despeje arquivos inteiros nem diga “deve funcionar”; relate somente o que foi
efetivamente implementado e verificado.
