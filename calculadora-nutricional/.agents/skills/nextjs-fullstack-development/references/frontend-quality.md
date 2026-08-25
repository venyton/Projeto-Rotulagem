# Integração de frontend e qualidade de experiência

Leia esta referência quando a mudança full-stack também afetar a interface,
fronteiras server/client, formulários, acessibilidade, performance ou SEO. Para
mudança puramente visual ou de composição shadcn, use somente a skill shadcn e as
referências locais exigidas pelo `AGENTS.md`.

## Integração com shadcn/ui

Quando a tarefa envolver shadcn, aplique também a skill shadcn. Ela governa CLI,
componentes, registries, presets, Base UI, Radix e composição visual; esta skill
governa arquitetura Next.js, dados e fronteiras server/client.

Preserve tokens, temas, componentes modificados e convenções. Confirme a
configuração instalada antes de presumir Radix ou Base UI, revise o diff antes de
atualizar componentes e não use `--overwrite` sem analisar substituições. Não
migre primitives nem adicione componentes preventivamente.

## Interface e formulários

Reutilize o design system e preserve a solução CSS existente. Prefira composição,
HTML semântico e estado próximo do uso. Trate hover, focus-visible, disabled,
invalid, loading, reduced motion, breakpoints, zoom e fontes maiores. Não misture
UI kits ou técnicas de estilo sem necessidade.

Formulários relevantes precisam de labels reais, descrição quando necessária,
valores iniciais coerentes, validação cliente para feedback e servidor como fonte
de verdade, pending/disabled, prevenção de duplicidade, preservação dos dados,
erros por campo e gerais e foco no primeiro erro quando apropriado. Use biblioteca
de formulário somente quando a complexidade justificar.

## Acessibilidade

Use WCAG 2.2 AA como referência salvo requisito diferente. Verifique headings,
teclado, foco visível, trap e retorno em dialogs, nomes acessíveis, contraste,
anúncio de erros, headers de tabela, `alt`, ícones decorativos, touch targets e
reduced motion. Informação não pode depender apenas de cor. Prefira HTML nativo a
ARIA e teste fluxos críticos por teclado.

## Performance

Priorize redução de JavaScript cliente, eliminação de waterfalls, consultas e
integrações lentas, Core Web Vitals, cache seguro, imagens/fontes e bundles.
Importe módulos de forma granular, use dynamic import apenas para conteúdo pesado
não inicial, configure `next/image` com dimensões e `sizes`, restrinja origens e
pagine dados. Compare antes/depois quando otimização for o objetivo.

## SEO

Para conteúdo público indexável, use Metadata API, título e descrição específicos,
canonical, Open Graph, sitemap e robots coerentes. Dados estruturados devem ser
verdadeiros. Preserve URLs e redirects e entregue conteúdo essencial sem depender
apenas de JavaScript. Não aplique SEO artificial a dashboards privados.
