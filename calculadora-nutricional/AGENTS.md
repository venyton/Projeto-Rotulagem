# AGENTS.md

## Escopo

Estas instruções valem para todo o repositório. A raiz Git contém a governança e
o CI; a aplicação principal fica em `calculadora-nutricional/`.

Execute comandos de Node.js, Prisma, Next.js e shadcn a partir de
`calculadora-nutricional/`, salvo quando o comando exigir a raiz Git.

## Princípio de operação

Este arquivo define contexto estável e roteia tarefas para skills. Não replique
aqui o workflow detalhado de cada skill: carregue o `SKILL.md` correspondente e
siga-o integralmente.

Antes de agir:

1. identifique o tipo e o escopo da tarefa;
2. confira as skills disponíveis e compare a tarefa com seus nomes e descrições;
3. se o usuário mencionar uma skill, use-a obrigatoriamente;
4. se a tarefa corresponder claramente à descrição de uma skill, use-a mesmo sem
   menção explícita;
5. leia por completo cada `SKILL.md` selecionado e somente as referências que ele
   exigir para a tarefa;
6. anuncie brevemente quais skills serão usadas e por quê;
7. use o menor conjunto de skills que cubra o trabalho e informe a ordem quando
   houver mais de uma.

Se uma skill indicada estiver ausente ou ilegível, informe isso e siga com a
melhor alternativa segura. Não simule que a skill foi aplicada.

## Roteador de skills do repositório

As skills locais ficam em `calculadora-nutricional/.agents/skills/`.

| Quando usar | Skill obrigatória | Fonte |
| --- | --- | --- |
| Alterar arquitetura ou comportamento full-stack do Next.js: rotas, renderização, fronteiras Server/Client, Actions, Route Handlers, dados, cache, Prisma, autenticação, integrações, testes, build, Docker ou CI/CD. Não usar para mudança puramente visual, CSS, conteúdo ou composição shadcn | `$nextjs-fullstack-development` | `calculadora-nutricional/.agents/skills/nextjs-fullstack-development/SKILL.md` |
| Criar ou alterar páginas, layouts, formulários e componentes com shadcn/ui; adicionar, compor, estilizar, depurar ou atualizar primitives, registries e presets shadcn | `$shadcn` | `calculadora-nutricional/.agents/skills/shadcn/SKILL.md` |
| Auditar ou fortalecer segurança; revisar autenticação, autorização, isolamento entre organizações, APIs, Server Actions, banco, segredos, dependências ou configuração de produção; investigar e corrigir vulnerabilidades | `$soizi-security-auditor` | `calculadora-nutricional/.agents/skills/soizi-information-security/SKILL.md` |

Skills disponibilizadas pelo ambiente, pelo usuário ou pelo sistema continuam
válidas. Use-as quando a descrição corresponder à tarefa; não é necessário listar
todas neste arquivo.

### Combinações comuns

- Mudança puramente visual, CSS, conteúdo, layout, formulário ou composição de
  componentes: somente `$shadcn`.
- Interface que também altera rota, dados, cache, Server Action, Route Handler,
  autorização ou fronteira Server/Client: `$shadcn` e
  `$nextjs-fullstack-development`.
- Mudança Next.js sem trabalho visual, como dados, API, cache, build ou arquitetura:
  somente `$nextjs-fullstack-development`.
- Mudança de autenticação, autorização, tenant ou API sensível:
  `$soizi-security-auditor` e `$nextjs-fullstack-development`.
- Auditoria sem implementação: `$soizi-security-auditor`.
- Documentação sem alteração de código: nenhuma skill de implementação é exigida,
  salvo quando outra skill disponível corresponder diretamente ao formato ou ao
  assunto.

## Requisito adicional para frontend e shadcn

Toda tarefa que use `$shadcn`, uma skill de frontend ou que crie/altere páginas,
layouts, formulários ou componentes visuais deve, antes da implementação, ler
integralmente:

`calculadora-nutricional/docs/references/formatacao-tabela-nutricional/ui-autoexplicativa.md`

Essa referência é um requisito local de produto e deve ser aplicada junto da
skill, especialmente em:

- hierarquia e arquitetura de informação;
- conteúdo mínimo e divulgação progressiva;
- labels, CTAs e ajuda contextual;
- estados de loading, vazio, erro, sucesso, foco e seleção;
- acessibilidade e comunicação que não dependa apenas de cor;
- responsividade que reorganiza a experiência no mobile;
- consequências, riscos, requisitos e permissões sempre visíveis.

Não basta citar o arquivo. Revise a interface pelo checklist da referência e
informe no handoff como seus critérios influenciaram a solução. Se a referência
estiver ausente ou não puder ser lida integralmente, interrompa a construção
visual e informe o bloqueio.

## Regras estáveis do projeto

- Confirme raiz Git, branch, `HEAD` e `git status` antes de editar.
- Preserve mudanças locais e arquivos não rastreados preexistentes.
- Não faça reset destrutivo, limpeza ampla, push, merge, deploy ou escrita em
  banco remoto sem autorização explícita.
- Use Server Components por padrão; adicione `"use client"` somente quando houver
  necessidade real de interação ou API do navegador.
- O navegador pode produzir prévias, mas autorização, persistência, cálculos
  oficiais e documentos autoritativos devem ser validados/recalculados no servidor.
- Nunca aceite `organizationId`, função, perfil, módulo ou permissão enviados pelo
  cliente como autoridade. Entidades tenant-scoped devem usar o `organizationId`
  derivado da sessão.
- Código com Prisma, segredos ou integrações permanece server-only. Domínios puros
  não importam infraestrutura.
- Preserve os contratos centralizados em
  `calculadora-nutricional/src/lib/validation` e os guardrails de
  `calculadora-nutricional/scripts/security-check.mjs`.
- Para banco remoto, confirme ambiente e variáveis, obtenha autorização explícita,
  faça backup e use migrations revisadas. Não use `prisma db push` em produção.
- A arquitetura atual está documentada em
  `calculadora-nutricional/docs/system/documentacao_completa_sistema.md`.

## Validação

Execute apenas os checks proporcionais à mudança. Gates disponíveis:

```bash
cd calculadora-nutricional
npm run check
npm run security:check
npm run build
git diff --check
```

Mudanças visuais devem verificar light/dark, responsividade, teclado, estados e o
comportamento real da ação. Mudanças apenas documentais exigem revisão dos paths,
formatação e `git diff --check`, mas não build. No handoff, separe o que foi
alterado, validado e o que depende de ambiente ou integração externa.
