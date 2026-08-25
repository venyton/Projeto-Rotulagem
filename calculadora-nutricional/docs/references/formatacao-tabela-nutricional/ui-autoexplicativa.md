# UI autoexplicativa do SoIZI

Referência obrigatória para criar ou revisar páginas, layouts, formulários e
componentes visuais.

## 1. Resultado esperado

A interface deve deixar evidente:

- onde a pessoa está;
- o que pode fazer agora;
- qual é a ação principal e sua consequência;
- quais requisitos, permissões ou riscos existem;
- como reconhecer e corrigir um problema;
- onde encontrar detalhes adicionais.

Explique por estrutura, hierarquia, proximidade, labels, estados e feedback. Use
texto somente quando ele ajuda a compreender, decidir, agir ou corrigir.

> Mostre o necessário para agir, revele o necessário para decidir e mantenha o
> restante disponível sob demanda.

## 2. Regra de decisão

Antes de manter qualquer conteúdo, pergunte:

1. É necessário para concluir a tarefa? **Mantenha visível.**
2. Muda a decisão ou comunica risco? **Mostre junto da ação.**
3. É frequente para a maioria? **Mostre de forma curta.**
4. É complementar e breve? **Use tooltip ou popover.**
5. É um conjunto secundário? **Use menu, accordion, aba ou painel.**
6. É raro ou especializado? **Leve para rota, documentação, log ou área avançada.**
7. Não atende a nenhuma condição? **Remova.**

Não corrija uma interface confusa adicionando parágrafos. Primeiro ajuste ordem,
agrupamento, labels, componentes, estados e ação principal.

## 3. Níveis de informação

| Nível | Conteúdo |
| --- | --- |
| **Sempre visível** | Título, valor/status principal, label, ação primária, erro bloqueante, requisito, escopo, prazo, permissão, risco e consequência. |
| **Contexto imediato** | Helper curto, metadado decisivo, orientação de uma frase e ação secundária frequente. |
| **Sob demanda** | Ação rara, detalhe, filtro adicional, histórico, configuração avançada e ajuda complementar. |
| **Especializado** | Documentação, auditoria, log, política, diagnóstico, payload e configuração rara. |

Nunca esconda requisito, consequência, risco, custo, prazo, permissão, regra legal
ou erro bloqueante em tooltip, placeholder, menu ou accordion.

## 4. Conteúdo e ações

- Título nomeia o objeto ou a tarefa: `Usuários`, `Nova tabela`, `Permissões`.
- Evite `Gerenciamento`, `Visão geral` e textos introdutórios sem contexto.
- Label permanece visível; placeholder não substitui label.
- Helper acrescenta uma regra real; não repete label ou componente.
- Use frases curtas, voz ativa e linguagem direta.
- Remova texto decorativo, promocional ou repetido.
- Link descreve o destino: `Ver regras de acesso`, não `Saiba mais`.
- Não invente a causa de uma falha desconhecida.

### Hierarquia de ações

- **Primária:** ação evidente com verbo e resultado, como `Salvar alterações`.
- **Secundária frequente:** permanece acessível, sem competir com a primária.
- **Rara:** pode ficar em menu.
- **Destrutiva:** informa escopo e consequência e exige confirmação proporcional.

Evite `OK`, `Continuar` e `Confirmar` quando houver rótulo específico como
`Adicionar ingrediente`, `Aplicar filtros` ou `Excluir tabela`.

## 5. Hierarquia e responsividade

Ordene a página por:

1. tarefa ou objeto atual;
2. status e informação essencial;
3. ação principal;
4. contexto imediato;
5. ações secundárias;
6. informação complementar;
7. detalhes especializados.

Use proximidade e espaçamento para mostrar relações. Não adicione borda, card ou
título quando o agrupamento espacial já for suficiente.

No mobile, reorganize a experiência; não apenas reduza fonte, labels, colunas ou
alvos de toque.

| Desktop | Mobile |
| --- | --- |
| Lista + detalhes | Lista → detalhe em rota ou painel full-screen |
| Conteúdo + painel de apoio | Conteúdo → ação para abrir o apoio |
| Filtros frequentes visíveis | Prioritários + `Mais filtros` |
| Tabela com colunas essenciais | Lista prioritária ou poucas colunas |

Metadados secundários podem ser reduzidos. Ações, labels, estados, requisitos e
consequências continuam acessíveis.

## 6. Padrões essenciais

| Contexto | Regra |
| --- | --- |
| **Formulário** | Agrupe campos relacionados; use label persistente, helper útil e erro junto ao campo. `required` e asterisco comunicam obrigatoriedade, mas a validação real continua no servidor. |
| **Tabela/lista** | Mostre identidade, status, metadado decisivo e ação comum. Leve permissões, histórico e detalhes para painel, aba ou rota. |
| **Filtros** | Mantenha busca e filtros frequentes visíveis; agrupe os raros; represente filtros ativos como chips ou resumo removível. |
| **Empty state** | Título curto, contexto quando necessário e próximo passo específico; no máximo uma ação primária e uma secundária. |
| **Erro** | Diga o que ocorreu, como tentar resolver e qual ação segura existe; detalhe técnico fica sob demanda. |
| **Ajuda** | Tooltip tem uma frase breve e não essencial; popover contém contexto curto e no máximo um link específico. |
| **Onboarding** | Curto, contextual, focado no benefício e dispensável; prefira empty state ou ajuda contextual a tour longo. |
| **Configuração avançada** | Pode ser recolhida apenas quando não for frequente, obrigatória, legal ou relacionada à segurança. |

### Abrangência da mensagem

| Abrangência | Componente/padrão |
| --- | --- |
| Aplicação | Banner ou `Alert` persistente |
| Seção | `Alert`/mensagem inline |
| Campo | Erro inline associado ao controle |
| Confirmação temporária | Sonner/toast |
| Ação destrutiva | `AlertDialog` |
| Tarefa curta contextual | `Dialog`, `Sheet` ou `Drawer` |
| Detalhes técnicos | Accordion, log ou área própria |

## 7. shadcn e composição

Use a skill `$shadcn`, os componentes existentes em `src/components/ui` e os
tokens semânticos do projeto. Não crie um design system paralelo.

| Necessidade | Preferir |
| --- | --- |
| Ação | `Button` com verbo específico |
| Formulário | Primitives de Field + controle adequado |
| Status | `Badge` com texto e semântica |
| Aviso | `Alert` |
| Ausência de conteúdo | `Empty` |
| Opções raras | `DropdownMenu` |
| Conteúdo secundário | `Accordion` ou `Collapsible` |
| Ajuda curta/contexto | `Tooltip` ou `Popover` |
| Carregamento | `Skeleton`, `Spinner` ou estado do componente |
| Separação semântica | `Separator` |

Escolha o componente pelo alcance e duração da interação. Não use modal para
processo longo nem tooltip para explicar um fluxo.

## 8. Estados e acessibilidade

Trate os estados aplicáveis: default, hover, focus, pressed, selected/expanded,
disabled, loading, empty, error e success.

- foco por teclado é visível;
- loading comunica progresso e evita envio duplicado;
- disabled tem motivo compreensível quando não for óbvio;
- seleção/status não dependem somente de cor;
- texto, ícone, fundo, contorno e ARIA se complementam quando necessário;
- contraste, ordem de foco, nome acessível e alvo de toque são preservados;
- feedback aparece próximo da ação ou no nível correto.

## 9. Antipadrões

Não use:

- página explicada por parágrafos;
- marketing em tela operacional;
- descrição que repete o título;
- placeholder como label;
- ícone ambíguo sem nome;
- CTA genérico;
- informação essencial em tooltip;
- tudo visível ou tudo escondido;
- card para toda seção;
- modal para qualquer tarefa;
- tabela desktop apenas comprimida no mobile;
- estado comunicado somente por cor;
- causa de erro inventada;
- onboarding obrigatório e longo.

## 10. Fluxo do Codex

Antes de editar:

1. identifique usuário, tarefa, ação principal e decisão mais importante;
2. identifique requisitos, permissões, riscos e consequências;
3. classifique conteúdo nos quatro níveis;
4. escolha componentes existentes, estados e comportamento desktop/mobile.

Durante a implementação:

- priorize estrutura → hierarquia → proximidade → labels → estados → feedback;
- mantenha informação essencial visível;
- aplique divulgação progressiva somente ao conteúdo secundário;
- preserve comportamento real, autorização e validação server-side.

Antes de concluir:

- [ ] título, ação primária e CTAs são específicos;
- [ ] labels, requisitos, riscos e consequências estão visíveis;
- [ ] cada texto ajuda a compreender, decidir, agir ou corrigir;
- [ ] conteúdo complementar está sob demanda e encontrável;
- [ ] componentes shadcn existentes foram reutilizados;
- [ ] loading, empty, error, success e disabled foram tratados quando aplicáveis;
- [ ] foco é visível e estado não depende apenas de cor;
- [ ] erros oferecem ação segura sem inventar a causa;
- [ ] ações destrutivas exibem escopo e consequência;
- [ ] mobile reorganiza a experiência e preserva ações/alvos de toque;
- [ ] comportamento real foi verificado em light/dark e teclado;

No handoff, informe quais critérios desta referência influenciaram a solução.

## 11. Base conceitual

Esta especificação consolida conteúdo e mensagens do Atlassian Design System,
divulgação progressiva do Microsoft Fluent 2, hierarquia/layouts adaptativos do
Material Design 3 e composição acessível do shadcn/Radix.

Fontes:

- https://atlassian.design/foundations/content/
- https://fluent2.microsoft.design/content-design
- https://fluent2.microsoft.design/layout
- https://m3.material.io/foundations/layout/canonical-examples/overview
- https://m3.material.io/foundations/interaction/states/overview
- https://ui.shadcn.com/docs/components

Essas fontes orientam comportamento; a implementação final segue os componentes,
tokens e contratos locais do SoIZI.
