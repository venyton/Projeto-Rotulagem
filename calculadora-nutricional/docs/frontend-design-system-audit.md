# Auditoria do design system do frontend

Data: 2026-08-11
Checkout: `Projeto-Rotulagem-main/calculadora-nutricional`
Referência de linguagem: Atlassian Design System, aplicada com Tailwind CSS + Radix/shadcn já existentes no produto. Nenhum componente Atlaskit foi adicionado.

Fundamentos consultados: [Elevation](https://atlassian.design/foundations/elevation), [Border](https://atlassian.design/foundations/border), [Radius](https://atlassian.design/foundations/radius), [Color](https://atlassian.design/foundations/color), [Spacing](https://atlassian.design/foundations/spacing), [Grid](https://atlassian.design/foundations/grid), [Product typefaces and scale](https://atlassian.design/foundations/typography/product-typefaces-and-scale), [M3 elevation overview](https://m3.material.io/styles/elevation/overview), [M3 applying elevation](https://m3.material.io/styles/elevation/applying-elevation) e [M3 elevation tokens](https://m3.material.io/styles/elevation/tokens).

## Contrato visual aplicado

- **Tokens semânticos:** superfícies, texto, borda, input, ação primária, estados e sidebar são definidos em `src/app/globals.css`. As páginas usam papéis (`bg-background`, `bg-card`, `text-muted-foreground`, `border-border`) em vez de depender de uma cor específica.
- **Temas:** claro e escuro mantêm a mesma hierarquia semântica, mas têm rampas próprias de neutros e ação. O dark mode usa superfícies sólidas e não o gradiente decorativo anterior.
- **Tipografia:** a UI usa Inter como equivalente compatível à Atlassian Sans (a referência descreve Atlassian Sans como derivada de Inter Variable), com fonte monoespaçada do sistema para código. A escala oficial foi materializada em `globals.css`: 48/40/32/28/24/20/16/14/12px, com headings em aproximadamente 1,2x e corpo em 1,5x, arredondados ao múltiplo de 4. Os nomes semânticos são `type-heading-xxlarge` até `type-heading-xxsmall`, `type-body-large`, `type-body`, `type-body-small`, `type-caption` e `type-code`. O controle de escala continua acessível em 15/16/17/18px sem alterar a proporção dos tokens.
- **Espaçamento:** a composição usa a escala rem do Tailwind, alinhada à base de 8px da referência: 4, 8, 12, 16, 24, 32, 40, 48 e 64px aparecem como intervalos de controle, seções e containers.
- **Raios:** 4px para detalhes/labels, 6px para controles interativos, 8px para cards/painéis, 12px para containers grandes e `rounded-full` apenas para elementos realmente circulares.
- **Bordas e foco:** bordas padrão usam `--border`/`--input`; seleção usa 2px com a cor de seleção; foco visível usa 2px, offset de 2px e `--ring`. Inputs, selects, tabelas, tabs segmentadas, cards estáticos, listas agrupadas e cabeçalhos/footer sticky usam borda porque precisam declarar um limite, não profundidade.
- **Elevação:** as superfícies seguem o papel da Atlassian e os cinco degraus de sombra do Material 3. O dark mode preserva as sombras e diferencia a altura também pela luminosidade da superfície; ele não elimina a elevação. Sombras ficam reservadas para elementos que realmente se deslocam ou se sobrepõem a outro conteúdo.
- **Grid:** `--grid-wide` é 1296px para dashboards e listas; `--grid-narrow` é 864px para leitura longa. `app-grid-wide` e `app-grid-narrow` alinham containers de topo; o conteúdo interno usa espaçamento, não uma grade excessiva.

## Mapa de páginas e responsabilidades

| Rota | Responsabilidade | Composição/contrato revisado |
| --- | --- | --- |
| `/` | Apresentar a SoIZI, explicar o fluxo e encaminhar para login/cadastro | Header público, hero, seções informativas e footer usam tokens globais e navegação responsiva |
| `/login` | Autenticar por credenciais ou concluir 2FA | Card de autenticação, inputs, OTP, estados de erro/loading e ações usam primitives tokenizadas |
| `/register` | Criar conta individual ou empresarial e aceitar documentos legais | Formulário, toggle de tipo, validação e checkbox seguem o contrato de campos e foco |
| `/forgot-password` | Solicitar link de recuperação | Estado de formulário e estado de sucesso usam `Empty`, input group e ações semânticas |
| `/reset-password` | Definir nova senha usando token | Estados de token inválido, formulário e loading seguem o mesmo shell de autenticação |
| `/termos-de-uso` | Exibir termos de uso | `LegalDocument` fornece cabeçalho, índice sticky, alerta e leitura confortável |
| `/politica-de-privacidade` | Exibir política de privacidade | Mesmo contrato editorial e de acessibilidade dos termos |
| `/dashboard` | Orientar o usuário no workspace e nos próximos fluxos | Shell autenticado, header de página, módulos e onboarding visual com superfície calma |
| `/dashboard/tables` | Listar, buscar, editar, duplicar e excluir tabelas nutricionais | Página contida, tabela/grid, badges de estado e ações outline/primary |
| `/dashboard/new` | Iniciar uma tabela nutricional | Formulário compartilhado e painel do gerador com espaçamento responsivo |
| `/dashboard/edit/[id]` | Editar formulação, cálculos e exportações | Editor complexo organizado por painéis, headers e estados semânticos |
| `/dashboard/edit/[id]/lupa` | Configurar a lupa frontal e exportar seus arquivos | Alertas regulatórios, badges de origem, preview e ações do editor |
| `/dashboard/ingredients` | Gerenciar ingredientes personalizados | Gate de módulo ou conteúdo de ingredientes, filtros, tabela e dialogs |
| `/dashboard/ingredients/my-ingredients` | Acesso compatível/legado à mesma gestão de ingredientes | Reutiliza `IngredientsPageContent` e o mesmo contrato de estados |
| `/dashboard/ingredients/technical-sheets` | Importar, revisar e aprovar fichas técnicas | Lista, revisão de extração, dialogs e estados de processamento |
| `/dashboard/enterprise` | Montar projetos de rótulos internacionais e aprovar versões | Workspace dinâmico, seleção de mercado, status e exportação |
| `/dashboard/api-access` | Criar e revogar tokens de acesso da API | Card de operação sensível, confirmação destrutiva e feedback de sucesso/erro |
| `/dashboard/profile` | Editar perfil e proteger a conta | Dados de conta, senha e 2FA em painéis responsivos |
| `/dashboard/settings` | Configurar organização, membros, módulos e padrão da lupa | Página administrativa densa com seções, tabs, dialogs e status |
| `/dashboard/master/modules` | Compatibilidade de rota administrativa | Redireciona para o dashboard sem introduzir uma tela falsa |
| `/dashboard/master/plans` | Compatibilidade de rota administrativa | Redireciona para o dashboard sem introduzir uma tela falsa |
| `/dashboard/modules` | Compatibilidade de rota de módulos | Redireciona para o dashboard sem introduzir uma tela falsa |

## Matriz de superfícies, bordas e elevação

| Classe/papel | Nível | Quando usar | Não usar para |
| --- | --- | --- | --- |
| `elevation-default` | M3 0 | Plano base e conteúdo sem agrupamento visual próprio | Delimitar cards, listas ou controles |
| `elevation-bordered` | M3 0 + borda de 1px | Cards estáticos, tabelas, listas, formulários, estados vazios e agrupamentos persistentes | Menus, dialogs e elementos que realmente flutuam |
| `elevation-sunken` | M3 0, superfície rebaixada | Poços de prévia, grupos de campos e conteúdo que pertence a um painel pai | Dentro de `raised`, `floating` ou `modal` |
| `elevation-raised` | M3 1 | Prévia de rótulo/lupa e foco único que representa uma peça deslocada | Todo card de página ou bloco de texto comum |
| `elevation-floating` | M3 2 | Select, popover, dropdown e menu contextual | Conteúdo persistente da página |
| `elevation-overlay` | M3 3 | Reserva para sobreposições empilhadas específicas | Cards ou menus simples |
| `elevation-modal` | M3 4 | Dialog, alert dialog e sheet modal | Barras, tabs, cards e previews internos |

| Rota/fluxo | Decisão específica de elevação e borda |
| --- | --- |
| `/` | Hero é plano sobre imagem; amostra de fluxo, itens e accordion usam bordas/divisores. Nenhuma seção editorial recebe sombra decorativa. |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Formulários são cards estáticos (`bordered`); OTP, inputs e separadores usam borda; qualquer confirmação é dialog/modal. |
| `/termos-de-uso`, `/politica-de-privacidade` | Leitura permanece no plano default; índice, alerta e divisores usam borda sem caixas elevadas. |
| `/dashboard` | Módulos e passos são listas estruturadas com divisores/borda; não são cards elevados. |
| `/dashboard/tables` | Busca no plano default; cada tabela é card estático com borda, header/footer dividido; paginação usa divisor. |
| `/dashboard/new`, `/dashboard/edit/[id]` | Editor é formado por painéis estáticos com borda, poços sunken para grupos de campos/ingredientes e bordas em tabelas/estados vazios. |
| `/dashboard/edit/[id]/lupa` | Editor externo é bordered; abas e métricas usam divisores. Somente a prévia branca do rótulo e a prancha técnica são raised por representarem um artefato destacado dentro de uma área sunken. |
| `/dashboard/ingredients`, `/dashboard/ingredients/my-ingredients` | Lista/tabela de ingredientes é bordered; diálogo de cadastro é modal; abas internas usam linha/divisor e os grupos de nutrientes usam sunken + bordered. |
| `/dashboard/ingredients/technical-sheets` | Lista e revisão são cards bordered; linhas/tabelas usam separadores; importação e aprovação são modais. |
| `/dashboard/enterprise` | Painéis persistentes, aprovações e status são bordered; área de prévia é sunken e seus artefatos preservam a hierarquia de rótulo. |
| `/dashboard/api-access` | Criação/lista de tokens são cards bordered; segredo recém-criado tem borda semântica de sucesso; revogação abre modal de confirmação. |
| `/dashboard/profile` | Preferências, conta, senha e 2FA são cards bordered, com QR como artefato visual destacado; não há elevação serializada. |
| `/dashboard/settings` | Abas de nível superior têm superfície sunken e aba ativa raised; formulários, tabelas, details e ações administrativas usam bordas/divisores; diálogos mantêm nível modal. |
| `/dashboard/master/modules`, `/dashboard/master/plans`, `/dashboard/modules` | Rotas de redirecionamento: não renderizam superfície própria. |

## Regras para abas, listas e conteúdo rolável

- Abas segmentadas têm contêiner `sunken` com borda; a aba ativa sobe somente um nível (`raised`). Abas de linha mantêm o divisor e usam o indicador de seleção, sem sombra.
- Linhas de tabela, lista, accordion e footer/header sticky usam borda de 1px. A borda é o indicador padrão quando há conteúdo oculto por scroll; `shadow-overflow` fica limitado aos shells que precisam sinalizar corte de conteúdo.
- Menus, popovers e selects usam `floating`; dialogs, alertas de confirmação e sheets usam `modal`. Isso evita que uma simples lista de opções tenha a mesma profundidade de uma confirmação destrutiva.

## Pontos de controle

- `src/app/globals.css`: fonte dos tokens, temas, foco, surfaces, painel, scrollbar e movimento reduzido.
- `src/components/ui/button.tsx`, `badge.tsx`, `card.tsx`, `input.tsx`, `select.tsx`, `textarea.tsx`, `native-select.tsx`, `input-group.tsx`, `toggle.tsx`, `switch.tsx` e `dialog.tsx`: primitives compartilhadas que evitam divergência entre páginas.
- `src/components/header.tsx`, `footer.tsx`, `dashboard/DashboardShell.tsx`, `layout/page-header.tsx`, `auth/AuthShell.tsx` e `legal/LegalDocument.tsx`: shells que garantem hierarquia e gutters consistentes.

## Limite da referência

Atlassian Design foi usado como referência de fundamentos — tokens, papéis de cor, dark mode, tipografia, espaçamento, borda, raio, foco e elevação. A identidade SoIZI, os nomes, os fluxos regulatórios e os componentes já presentes permanecem próprios do produto.
