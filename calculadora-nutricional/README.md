# Calculadora Nutricional

Aplicacao web para criacao, calculo, pre-visualizacao, salvamento e exportacao de tabelas nutricionais para rotulagem de alimentos.

O sistema permite montar receitas por ingredientes, calcular nutrientes por 100 g e por porcao, aplicar regras de rotulagem, selecionar modelos oficiais de tabela, gerar lupa frontal quando aplicavel e exportar imagens, Excel ou pacote ZIP completo.

Documentacao:

```text
docs/README.md
docs/system/documentacao_completa_sistema.md
```

## O que o sistema faz

- Cadastro, login e sessao de usuarios.
- Gestao de perfil e senha.
- Cadastro manual de ingredientes.
- Importacao e exportacao de ingredientes por Excel.
- Busca de ingredientes oficiais e proprios, com suporte a acentos e remocao de duplicados.
- Importacao de fichas tecnicas por IA com revisao humana.
- Calculo nutricional por receita.
- Calculo por 100 g e por porcao.
- Separacao entre acucares totais e acucares adicionados.
- Marcacao automatica/sugerida de ingredientes que contam como acucar adicionado.
- Selecao de grupo de alimentos, produto sugerido, porcao e medida caseira.
- Calculo de porcoes por embalagem.
- Selecao de micronutrientes opcionais.
- Suporte a constituintes extras, como creatina, cafeina, lactose, galactose, enzimas e probioticos.
- Suporte a populacao geral e grupos populacionais especificos.
- Suporte a categorias regulatorias especiais.
- Remocao de `%VD` quando a categoria nao deve declarar percentual de valores diarios.
- Calculo da lupa frontal para alto em acucar adicionado, gordura saturada e sodio.
- Pre-visualizacao de modelos oficiais.
- Exportacao em PNG, JPEG, WEBP, Excel e ZIP completo.
- Salvamento e reabertura de tabelas com estado completo de configuracao.
- Workspace enterprise para mercados internacionais, versoes e fluxo de aprovacao.
- Idioma global da interface com padrao em portugues do Brasil.

## Modelos de tabela

Modelos disponiveis:

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

## Categorias regulatorias

O sistema trabalha com:

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

Tambem permite selecionar:

```text
Populacao geral
0-6 meses
7-11 meses
1-3 anos
4-8 anos
9-18 anos
>=19 anos
Gestantes
Lactantes
```

## Stack

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

## Estrutura principal

```text
src/app                  Rotas, paginas e APIs
src/features             Regras e componentes por dominio
src/components/ui        Componentes reutilizaveis
src/lib                  Infraestrutura compartilhada
prisma                   Schema do banco
Dataset                  Bases, templates e referencias
docs                     Documentacao
scripts                  Seeds e utilitarios
```

## Rotas principais

Publicas:

```text
/
/login
/register
```

Protegidas:

```text
/dashboard
/dashboard/new
/dashboard/edit/[id]
/dashboard/ingredients
/dashboard/ingredients/my-ingredients
/dashboard/ingredients/technical-sheets
/dashboard/enterprise
/dashboard/profile
/dashboard/debug
```

APIs:

```text
/api/auth/[...nextauth]
/api/export/excel
/api/export/complete
/api/open-food-facts/products
/api/debug-auth
/api/debug/force-migrate
```

## Variaveis de ambiente

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

`OPEN_FOOD_FACTS_USER_AGENT` e opcional, mas recomendado em producao para identificar o app nas chamadas ao Open Food Facts. Ao importar um produto, o sistema salva uma copia normalizada na tabela `Ingredient` com id `off-{codigo_de_barras}`, reduzindo dependencia da API externa nas proximas buscas.

`GEMINI_API_KEY` habilita o importador de fichas tecnicas por IA. Sem ela, o importador retorna erro de provider nao configurado.

## Como rodar

Instalar dependencias:

```bash
npm install
```

Gerar Prisma Client:

```bash
npx prisma generate
```

Rodar em desenvolvimento:

```bash
npm run dev
```

Abrir:

```text
http://localhost:3000
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run seed
npm run seed-user
npm run test-db
```

Atencao: o `npm run build` apenas gera o Prisma Client e compila o Next.js. Para alterar schema no banco, confira o alvo do `.env` e rode `npm run db:push` manualmente.

## Arquivos importantes

```text
src/features/tables/components/TableGenerator.tsx
src/features/tables/components/NutritionalLabel.tsx
src/features/tables/domain/nutrients.ts
src/features/tables/domain/anvisa.ts
src/features/tables/domain/constants.ts
src/features/ingredients/components/AddIngredientForm.tsx
src/features/ingredients/actions/custom-ingredient-actions.ts
src/features/technical-sheets/actions/technical-sheet-actions.ts
src/features/technical-sheets/services/technical-sheet-ai-service.ts
src/features/enterprise/components/EnterpriseWorkspace.tsx
src/features/enterprise/actions/enterprise-label-actions.ts
src/features/open-food-facts/components/OpenFoodFactsImporter.tsx
src/app/api/open-food-facts/products/route.ts
src/app/api/export/excel/route.ts
src/app/api/export/complete/route.ts
src/lib/export/excel-generator.ts
prisma/schema.prisma
```

## Observacao

O sistema automatiza calculo, formato, pre-visualizacao e varias regras regulatórias. A aprovacao final do rotulo ainda deve passar por revisao tecnica, principalmente para suplementos, alimentos infantis, formulas, fins especiais, alegacoes e regras complementares de rotulagem.
