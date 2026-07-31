# Documentacao completa do sistema

Atualizado em: 30/07/2026.

## 1. Visao geral

O sistema e uma aplicacao web para criacao, calculo, revisao, pre-visualizacao, salvamento e exportacao de tabelas nutricionais para rotulagem de alimentos.

Ele foi construido para apoiar o fluxo operacional de rotulagem nutricional com base em receitas, ingredientes, grupos de alimentos, porcoes, medidas caseiras e regras regulatórias da Anvisa. O foco do produto e permitir que o usuario monte uma receita, calcule seus nutrientes, escolha o modelo oficial de tabela, valide regras importantes e gere arquivos para uso em rotulo, planilha ou revisao tecnica.

A base atual tambem inclui importacao de fichas tecnicas por IA, revisao humana antes de transformar dados extraidos em ingrediente, organizacao de SQL para execucao manual e um workspace enterprise para versoes, aprovacao e mercados internacionais.

O projeto fica em:

```text
/home/paz/Projeto-Rotulagem/calculadora-nutricional
```

Stack principal:

```text
Next.js 16
React 19
TypeScript
Prisma
PostgreSQL
NextAuth
Tailwind CSS
ExcelJS
html-to-image
XLSX
Gemini API
Open Food Facts
```

## 2. Publico e finalidade

O sistema atende principalmente:

- profissionais que montam tabelas nutricionais;
- usuarios que precisam cadastrar receitas e gerar rotulos;
- equipes que precisam exportar tabelas em imagem e Excel;
- operacao interna que precisa salvar, editar e reaproveitar tabelas;
- analistas que precisam lidar com alimentos gerais, suplementos e categorias especiais.

Ele nao substitui uma auditoria regulatoria final feita por responsavel tecnico. O sistema automatiza calculo, formato e varias regras, mas a decisao final sobre enquadramento regulatorio, alegacoes, limites e uso do rotulo ainda depende do produto real e da revisao tecnica.

## 3. Principais capacidades

### 3.1 Cadastro e autenticacao de usuarios

O sistema permite:

- cadastrar usuario com nome, email e senha;
- autenticar por email e senha via NextAuth Credentials;
- proteger as paginas do painel;
- manter sessao por JWT;
- editar dados de perfil;
- alterar senha com validacao da senha atual;
- exigir novo login quando o email do perfil e alterado.

Arquivos principais:

```text
src/lib/auth.ts
src/features/auth/actions/register-user.ts
src/features/profile/actions/profile-actions.ts
src/app/login/page.tsx
src/app/register/page.tsx
src/app/dashboard/profile/page.tsx
```

### 3.2 Painel de tabelas salvas

No painel, o usuario consegue:

- ver suas tabelas salvas;
- criar nova tabela;
- abrir uma tabela existente para edicao;
- visualizar dados basicos como titulo, porcao, grupo populacional e data de criacao.

Cada tabela salva pertence ao usuario logado.

Arquivos principais:

```text
src/app/dashboard/page.tsx
src/app/dashboard/new/page.tsx
src/app/dashboard/edit/[id]/page.tsx
src/features/tables/actions/table-actions.ts
```

### 3.3 Cadastro de ingredientes

O sistema trabalha com dois tipos de ingredientes:

- base oficial/importada no banco, em `Ingredient`;
- ingredientes personalizados do usuario, em `CustomIngredient`.

O usuario consegue:

- cadastrar ingrediente manualmente;
- editar ingrediente proprio;
- excluir ingrediente proprio;
- inspecionar valores nutricionais;
- importar ingredientes por Excel;
- exportar seus ingredientes para Excel;
- pesquisar ingredientes oficiais e proprios no gerador de tabela.

O cadastro aceita macronutrientes, gorduras, acucares, sodio, fibras e uma lista ampla de micronutrientes.

Campos principais:

```text
Valor energetico
Carboidratos
Acucares totais
Acucares adicionados
Proteinas
Fibras alimentares
Sodio
Gorduras totais
Gorduras saturadas
Gorduras trans
Gorduras monoinsaturadas
Gorduras poli-insaturadas
Omega 6
Omega 3
Colesterol
Vitaminas
Minerais
Colina
```

Arquivos principais:

```text
src/features/ingredients/actions/custom-ingredient-actions.ts
src/features/ingredients/actions/import-ingredient-actions.ts
src/features/ingredients/components/AddIngredientForm.tsx
src/features/ingredients/components/IngredientSelector.tsx
src/features/ingredients/components/IngredientsTable.tsx
src/features/ingredients/components/ImportIngredientsDialog.tsx
src/features/ingredients/components/InspectIngredientDialog.tsx
```

### 3.4 Busca de ingredientes

A busca de ingredientes:

- pesquisa base oficial e ingredientes do usuario;
- aceita busca com ou sem acento;
- busca por termo direto e por nome normalizado;
- separa visualmente "Meus ingredientes" e "Base oficial";
- remove duplicados por nome normalizado dentro da mesma origem;
- prioriza ingredientes proprios quando aplicavel.

Exemplo: buscar `acuca` encontra `Acucar`, `Acucar cristal`, `Acucar mascavo`, etc., sem duplicar itens iguais da base oficial.

### 3.5 Importacao e exportacao de ingredientes

O usuario pode importar um arquivo `.xlsx` ou `.xls` com colunas de nutrientes.

Colunas aceitas incluem:

```text
Nome
Energia
Proteina
Carboidratos
Gorduras Totais
Gorduras Saturadas
Gorduras Trans
Fibra
Sodio
Acucares Totais
Acucares Adicionados
Vitaminas
Minerais
Gorduras monoinsaturadas
Gorduras poli-insaturadas
Omega 6
Omega 3
Colesterol
```

Tambem e possivel exportar os ingredientes proprios para `meus-ingredientes.xlsx`.

### 3.6 Criacao de tabela nutricional por receita

O gerador de tabela permite:

- escolher grupo de alimentos;
- escolher produto sugerido dentro do grupo;
- preencher automaticamente nome, porcao e medida caseira quando ha produto sugerido;
- editar manualmente o nome do produto;
- definir porcao em gramas;
- definir medida caseira;
- definir conteudo da embalagem;
- calcular porcoes por embalagem automaticamente;
- declarar porcoes por embalagem manualmente;
- selecionar ingredientes;
- informar quantidade de cada ingrediente;
- marcar se um ingrediente conta como acucar adicionado;
- limpar ingredientes selecionados;
- calcular peso total dos ingredientes;
- selecionar micronutrientes opcionais para aparecerem na tabela.

Arquivos principais:

```text
src/features/tables/components/TableGenerator.tsx
src/features/tables/domain/food-groups.ts
src/features/tables/domain/household-measures.ts
```

### 3.7 Calculo nutricional

O calculo central fica em:

```text
src/features/tables/domain/nutrients.ts
```

O sistema calcula:

- totais da receita;
- valores por 100 g;
- valores por porcao;
- energia;
- carboidratos;
- acucares totais;
- acucares adicionados;
- proteinas;
- gorduras totais;
- gorduras saturadas;
- gorduras trans;
- fibras;
- sodio;
- micronutrientes selecionaveis.

O calculo usa a quantidade de cada ingrediente em gramas e escala os nutrientes informados por 100 g.

### 3.8 Separacao entre acucares totais e adicionados

O sistema separa acucares totais e acucares adicionados.

Regra aplicada:

- acucares totais sempre entram em `sugarTotal`;
- acucares adicionados entram em `sugarAdded` quando:
  - o ingrediente tem `sugarAdded` declarado;
  - ou o usuario marca o ingrediente como acucar adicionado;
  - ou o sistema identifica pelo nome que o ingrediente provavelmente e acucar adicionado.

O sistema sugere automaticamente acucar adicionado quando o nome do ingrediente contem termos como:

```text
acucar
sacarose
glicose
frutose
lactose
dextrose
acucar invertido
mel
melaco
melado
rapadura
caldo de cana
extrato de malte
xarope
maltodextrina
carboidrato hidrolisado
```

O usuario ainda pode alterar manualmente a marcacao.

### 3.9 Regras de arredondamento e FOP

As regras de arredondamento e lupa frontal ficam em:

```text
src/features/tables/domain/anvisa.ts
```

O sistema aplica arredondamento para:

- valor energetico;
- carboidratos;
- proteinas;
- gorduras totais;
- fibras;
- acucares;
- gorduras saturadas;
- gorduras trans;
- sodio;
- percentual de valores diarios.

Tambem calcula a lupa frontal para:

- alto em acucar adicionado;
- alto em gordura saturada;
- alto em sodio.

Limites usados:

```text
Solidos e semissolidos, por 100 g:
- acucares adicionados: 15 g
- gordura saturada: 6 g
- sodio: 600 mg

Liquidos, por 100 ml:
- acucares adicionados: 7,5 g
- gordura saturada: 3 g
- sodio: 300 mg
```

O usuario pode informar se a base da lupa e:

- solido/semissolido;
- liquido;
- como exposto a venda;
- pronto para consumo.

### 3.10 Base regulatoria e VDR

O sistema permite escolher dois cenarios:

```text
Populacao geral - alimentos em geral
Grupo populacional especifico / suplementos
```

Para alimentos em geral, usa a referencia de populacao geral.

Para produtos destinados a grupo especifico, usa um dos grupos:

```text
0-6 meses
7-11 meses
1-3 anos
4-8 anos
9-18 anos
>=19 anos
Gestantes
Lactantes
```

Suplemento alimentar força o uso de grupo populacional especifico.

Os VDR ficam em:

```text
src/features/tables/domain/constants.ts
```

### 3.11 Categorias regulatorias especiais

O sistema tem seletor de categoria regulatoria:

```text
Alimento em geral
Suplemento alimentar
Alimento para fins especiais
Formula infantil
Formula para nutricao enteral
Formula dietoterapica
Dieta com restricao de lactose
Sal hipossodico
```

Essas categorias alteram o comportamento:

- suplemento força grupo populacional especifico;
- formula infantil, enteral e dietoterapica desligam a declaracao de `%VD`;
- dieta com restricao de lactose sugere constituintes extras `Lactose` e `Galactose`;
- sal hipossodico marca `Potassio`;
- o sistema mostra avisos de conformidade por categoria.

### 3.12 Constituintes extras

O sistema permite adicionar constituintes extras na tabela.

Uso previsto:

```text
Creatina
Cafeina
Probióticos
Enzimas
Colageno
Lactase
Lactose
Galactose
Substancias bioativas
Outros constituintes adicionados ou obrigatorios
```

Cada constituinte extra tem:

```text
nome
quantidade por porcao
unidade
```

Eles aparecem na pre-visualizacao e nas exportacoes por imagem.

### 3.13 Modelos de tabela nutricional

O sistema pre-visualiza e exporta diferentes modelos:

```text
Vertical
Horizontal
Vertical Quebrado
Horizontal Quebrado
Linear
Agregado
Simplificada
B2B
Adicao de Ingredientes
Porcao = 100 g/ml
Suplemento Alimentar
Suplemento por Grupo
```

O seletor de modelo ajusta automaticamente os tipos marcados no exportador.

Comportamentos importantes:

- suplemento mostra modelos de suplemento;
- modelo `Porcao = 100 g/ml` so fica disponivel quando a porcao e 100;
- modelos sem `%VD` removem a coluna de verdade, sem deixar espaco vazio;
- tabelas escalam para caber na janela de pre-visualizacao;
- preview possui divisorias horizontais e verticais;
- cabecalhos de colunas sao centralizados.

Arquivo principal:

```text
src/features/tables/components/NutritionalLabel.tsx
```

### 3.14 Selo frontal de advertencia

Quando aplicavel, o sistema renderiza o selo de lupa frontal.

O selo pode indicar:

```text
ALTO EM ACUCAR ADICIONADO
ALTO EM GORDURA SATURADA
ALTO EM SODIO
```

Arquivo principal:

```text
src/features/tables/components/MagnifyingGlassLabel.tsx
```

### 3.15 Exportacao por imagem

O sistema exporta imagens da tabela em:

```text
PNG
JPEG
WEBP
```

Quando ha mais de um arquivo, gera ZIP no cliente.

Tambem permite exportar o selo FOP junto, quando ativo.

Bibliotecas usadas:

```text
html-to-image
jszip
```

### 3.16 Exportacao Excel oficial

O sistema exporta planilha Excel com base em template oficial.

Endpoint:

```text
POST /api/export/excel
```

Arquivos principais:

```text
src/app/api/export/excel/route.ts
src/lib/export/excel-generator.ts
Dataset/reference/table-examples/modelos_oficiais_tabelas_excel.xlsx
```

A exportacao respeita:

- modelo selecionado;
- dados por 100 g;
- dados por porcao;
- %VD, quando aplicavel;
- grupo populacional;
- suplemento;
- tabelas sem %VD;
- selecionados de micronutrientes.

### 3.17 Pacote completo

O sistema gera pacote ZIP com Excel e imagens.

Endpoint:

```text
POST /api/export/complete
```

O pacote pode conter:

```text
planilha_nutricional.xlsx
tabela_<modelo>.png
selo_fop.png
```

### 3.18 Documentos técnicos

O gerador possui quatro downloads técnicos independentes:

```text
Memorial de cálculo  PDF e XLSX
Ficha técnica        PDF e XLSX
```

O Memorial reúne identificação, parâmetros, formulação, contribuição por
componente, micronutrientes, resultados consolidados e verificações. O XLSX
entregue ao usuário contém somente a aba `Memorial de Cálculo`.

A Ficha técnica reúne identificação do produto, características
físico-químicas, microbiológicas, contaminantes, matérias estranhas,
informação nutricional, apresentação, logística, revisões e aprovações. Seu
XLSX contém as abas `Ficha Técnica` e `Dados do Sistema`.

Endpoint protegido:

```text
GET /api/export/memorial?tableId=<id>&document=memorial|technical&format=pdf|xlsx
```

Os documentos usam os cálculos existentes, exportam valores materializados e
mantêm campos obrigatórios mesmo quando não há informação cadastrada. Nesses
casos, o arquivo informa `Não informado no cadastro`. Fórmulas, fatores
internos, referências de células e estrutura interna do banco não são expostos.

Arquivos principais:

```text
src/app/api/export/memorial/route.ts
src/lib/export/memorial-pdf.ts
src/lib/export/memorial-xlsx.ts
src/lib/export/technical-sheet-xlsx.ts
```

### 3.19 Persistencia completa da UI

O sistema salva a tabela gerada e tambem o estado de configuracao da interface.

Dados persistidos em `GeneratedTable`:

```text
title
portion
uom
householdMeasure
popGroup
packageContent
servingsPerPackage
suggestedFoodGroup
suggestedProduct
uiState
items
```

O `uiState` guarda configuracoes como:

```text
grupo/produto sugerido
conteudo da embalagem
modo de porcoes por embalagem
cenario regulatorio
categoria regulatoria
suplemento
constituintes extras
nutrientes selecionados
modelos selecionados
formatos de imagem
perfil de conformidade
base da lupa
dados do produto pronto para consumo
frases obrigatorias
```

Isso permite reabrir uma tabela salva com as configuracoes voltando para a tela.

### 3.20 Perfil de conformidade

O sistema inclui um bloco de conformidade com:

```text
Modo conformidade
Perfil regulatorio do produto
Categoria regulatoria
Classificacao da base da lupa
Base de calculo da lupa
Frases obrigatorias para casos especificos
Avisos operacionais
```

Perfis disponiveis:

```text
Alimento geral
Agua envasada
Sal iodado
Farinha de trigo/milho enriquecida
Categoria com vedacao de lupa
```

### 3.21 Importador de fichas tecnicas por IA

O importador recebe PDFs ou imagens de fichas tecnicas, envia o conteudo para Gemini no servidor e grava uma extracao revisavel antes de criar ingrediente.

Fluxo:

1. Usuario envia um ou mais arquivos em `Ingredientes`.
2. O servidor valida tipo e tamanho.
3. Gemini retorna JSON estruturado.
4. O sistema normaliza nutrientes, alergenicos e campos tecnicos.
5. O usuario revisa os campos extraidos.
6. Aprovacao humana cria ingrediente em `CustomIngredient`.

Modelos/tabelas envolvidos:

```text
TechnicalDocument
TechnicalSheetExtraction
ExtractedNutrient
ExtractedAllergen
ExtractedTechnicalField
CustomIngredient
```

Arquivos principais:

```text
src/features/technical-sheets/actions/technical-sheet-actions.ts
src/features/technical-sheets/domain/technical-sheet-schema.ts
src/features/technical-sheets/domain/technical-sheet-normalizer.ts
src/features/technical-sheets/domain/technical-sheet-validator.ts
src/features/technical-sheets/services/technical-sheet-ai-service.ts
src/features/technical-sheets/services/technical-sheet-file-service.ts
src/app/dashboard/ingredients/technical-sheets/page.tsx
```

### 3.22 Workspace enterprise

O modulo enterprise permite criar projetos de rotulo a partir de uma tabela base e acompanhar versoes, mercado internacional e aprovacao.

Mercados suportados no dominio atual:

```text
Brasil
Estados Unidos
Uniao Europeia
Canada
Mexico
Chile
```

O fluxo registra snapshots para preservar o estado do rotulo no momento da revisao.

Modelos/tabelas envolvidos:

```text
EnterpriseLabelProject
EnterpriseLabelVersion
EnterpriseApproval
EnterpriseExport
```

Arquivos principais:

```text
src/features/enterprise/domain/enterprise.ts
src/features/enterprise/components/EnterpriseWorkspace.tsx
src/features/enterprise/components/InternationalNutritionLabel.tsx
src/features/enterprise/actions/enterprise-label-actions.ts
src/app/dashboard/enterprise/page.tsx
```

### 3.23 Idioma global da interface

O idioma global fica em `src/features/i18n`. O padrao e `pt-BR`; a selecao de mercado enterprise nao muda automaticamente o idioma global da aplicacao.

Idiomas previstos:

```text
pt-BR
en-US
es-MX
es-CL
fr-CA
```

## 4. Mapa de paginas

Publicas:

```text
/                Landing page
/login           Login
/register        Cadastro
```

Protegidas:

```text
/dashboard                         Minhas tabelas
/dashboard/new                     Nova tabela
/dashboard/edit/[id]               Editar tabela salva
/dashboard/ingredients             Ingredientes
/dashboard/ingredients/my-ingredients Ingredientes do usuario
/dashboard/ingredients/technical-sheets Fichas tecnicas importadas
/dashboard/enterprise              Workspace enterprise
/dashboard/profile                 Perfil e seguranca
```

## 5. Mapa de APIs

```text
/api/auth/[...nextauth]    Autenticacao NextAuth
/api/export/excel         Exportacao Excel
/api/export/complete      Exportacao ZIP completo
/api/export/memorial      Memorial e Ficha técnica em PDF/XLSX
/api/open-food-facts/products Busca segura no Open Food Facts
```

## 6. Banco de dados

Modelos principais:

```text
User
Ingredient
CustomIngredient
GeneratedTable
TableItem
TechnicalDocument
TechnicalSheetExtraction
ExtractedNutrient
ExtractedAllergen
ExtractedTechnicalField
EnterpriseLabelProject
EnterpriseLabelVersion
EnterpriseApproval
EnterpriseExport
```

Resumo:

- `User`: conta do usuario.
- `Ingredient`: base oficial/importada de ingredientes.
- `CustomIngredient`: ingrediente criado/importado pelo usuario.
- `GeneratedTable`: tabela salva e configuracoes principais.
- `TableItem`: snapshot dos ingredientes usados na tabela.
- `TechnicalDocument`: arquivo enviado ao importador de fichas tecnicas e JSON extraido.
- `TechnicalSheetExtraction`: dados normalizados e revisaveis da ficha.
- `ExtractedNutrient`, `ExtractedAllergen`, `ExtractedTechnicalField`: detalhes extraidos por categoria.
- `EnterpriseLabelProject`, `EnterpriseLabelVersion`, `EnterpriseApproval`, `EnterpriseExport`: workspace enterprise, versoes, aprovacao e exportacoes.

Arquivo:

```text
prisma/schema.prisma
```

## 7. Arquitetura do codigo

Estrutura principal:

```text
src/app                  Rotas, paginas e APIs
src/features             Regras e componentes por dominio
src/components/ui        Componentes visuais reutilizaveis
src/lib                  Infraestrutura compartilhada
prisma                   Schema Prisma
Dataset                  Bases, templates e referencias
docs                     Documentacao
scripts                  Seeds e utilitarios
```

Dominios em `src/features`:

```text
auth
enterprise
i18n
ingredients
open-food-facts
profile
tables
technical-sheets
```

## 8. Fluxo operacional principal

Fluxo para gerar uma tabela:

1. Usuario entra no painel.
2. Cria nova tabela.
3. Escolhe grupo de alimentos ou preenche manualmente.
4. Define porcao, medida caseira e conteudo da embalagem.
5. Configura categoria regulatoria, VDR e lupa.
6. Adiciona ingredientes e quantidades.
7. Quando quiser usar produto de mercado, busca no Open Food Facts por codigo de barras ou nome, revisa os dados e importa como ingrediente. Ao importar, uma copia normalizada fica salva na base interna.
8. Marca ingredientes que contam como acucar adicionado, se necessario.
9. Seleciona micronutrientes e constituintes extras.
10. Escolhe modelo de tabela.
11. Confere pre-visualizacao.
12. Salva a tabela.
13. Exporta imagem, Excel ou pacote completo.
14. Opcionalmente importa ficha tecnica com IA, revisa e salva como ingrediente.
15. Opcionalmente abre o workspace enterprise para versoes e mercado internacional.

## 9. Variaveis de ambiente

Variaveis esperadas:

```text
POSTGRES_PRISMA_URL
POSTGRES_URL_NON_POOLING
NEXTAUTH_SECRET
NEXTAUTH_URL
OPEN_FOOD_FACTS_USER_AGENT
GEMINI_API_KEY
GEMINI_MODEL
TECHNICAL_SHEET_MAX_FILE_SIZE_MB
TECHNICAL_SHEET_MAX_BATCH_FILES
```

O codigo de autenticacao tambem possui fallback para `DATABASE_URL` em diagnostico, mas o schema Prisma usa `POSTGRES_PRISMA_URL` e `POSTGRES_URL_NON_POOLING`.

`OPEN_FOOD_FACTS_USER_AGENT` e opcional, mas recomendado em producao para identificar a aplicacao nas chamadas ao Open Food Facts. A busca externa deve ser tratada como apoio operacional: o usuario precisa revisar os valores antes de usar no rotulo. Produtos importados ficam cacheados na tabela `Ingredient` com id `off-{codigo_de_barras}` e `origin = Open Food Facts`; as consultas externas normalizadas usam o Data Cache do Next com TTL de 10 minutos para nome e 24 horas para codigo de barras.

Ingredientes mantem o campo normalizado `searchName` para busca sem acentos. Ele e preenchido nas escritas da aplicacao e indexado com `pg_trgm`; a migration correspondente tambem faz o backfill dos registros existentes.

`GEMINI_API_KEY` habilita o importador de fichas tecnicas. `GEMINI_MODEL`, `TECHNICAL_SHEET_MAX_FILE_SIZE_MB` e `TECHNICAL_SHEET_MAX_BATCH_FILES` permitem ajustar modelo, tamanho maximo e lote de upload sem alterar o codigo.

## 10. Scripts

Scripts principais:

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run seed
npm run seed-user
npm run test-db
```

Observacao importante:

```text
npm run build
```

executa:

```text
npx prisma generate --schema=./prisma/schema.prisma && next build
```

Ou seja, o build atual apenas gera o Prisma Client e compila o Next.js. Alteracao de schema no banco deve ser feita manualmente e fora do build, usando `npm run db:push` somente quando o alvo do banco estiver conferido.

## 11. Pontos de atencao

- A conformidade final de rotulo ainda precisa de revisao tecnica.
- Categorias especiais podem exigir declaracoes, limites, alegacoes e regras fora da tabela nutricional.
- Constituintes extras aparecem na pre-visualizacao e exportacao por imagem; a planilha Excel oficial ainda depende da estrutura do template para comportar esses campos como linhas proprias.
- O fluxo de Excel prioriza preencher template oficial existente.
- Arquivos de `docs/` nao devem entrar em commits de codigo quando a orientacao for "nao commitar docs".

## 12. Arquivos mais importantes

```text
src/features/tables/components/TableGenerator.tsx
src/features/tables/components/NutritionalLabel.tsx
src/features/tables/components/MagnifyingGlassLabel.tsx
src/features/tables/domain/nutrients.ts
src/features/tables/domain/anvisa.ts
src/features/tables/domain/constants.ts
src/features/tables/domain/micronutrients.ts
src/features/tables/actions/table-actions.ts
src/features/ingredients/components/AddIngredientForm.tsx
src/features/ingredients/components/IngredientSelector.tsx
src/features/ingredients/actions/custom-ingredient-actions.ts
src/features/technical-sheets/actions/technical-sheet-actions.ts
src/features/technical-sheets/services/technical-sheet-ai-service.ts
src/features/enterprise/components/EnterpriseWorkspace.tsx
src/features/enterprise/actions/enterprise-label-actions.ts
src/features/i18n/domain/site-i18n.ts
src/app/api/export/excel/route.ts
src/app/api/export/complete/route.ts
src/lib/export/excel-generator.ts
prisma/schema.prisma
```

## 13. Resumo final

O sistema hoje faz:

- cadastro/login de usuarios;
- gestao de perfil e senha;
- cadastro, importacao, edicao, exclusao e exportacao de ingredientes;
- busca inteligente de ingredientes oficiais e proprios;
- calculo nutricional por receita;
- separacao entre acucares totais e adicionados;
- calculo por 100 g e por porcao;
- calculo de %VD por grupo populacional;
- suporte a Anexo II e Anexo VIII;
- suporte a categorias especiais;
- importacao de fichas tecnicas por IA com revisao humana;
- workspace enterprise com mercado, versoes e aprovacao;
- desligamento de %VD para formulas que nao devem declarar;
- selecao de micronutrientes;
- inclusao de constituintes extras;
- calculo e renderizacao de lupa frontal;
- pre-visualizacao de modelos oficiais;
- exportacao de imagens;
- exportacao Excel;
- exportacao de Memorial de calculo em PDF e XLSX;
- exportacao de Ficha tecnica em PDF e XLSX;
- pacote ZIP completo;
- persistencia de tabelas e estado completo da UI.

Ele e, na pratica, uma plataforma de trabalho para gerar e manter rotulagem nutricional com calculo, regras, visualizacao e exportacao em um unico fluxo.
