# Estrutura do Projeto

Atualizado em: 14/05/2026.

## 1. Visao do produto

Este repositorio mantem uma aplicacao web para geracao de rotulagem nutricional. O fluxo cobre calculo por receita, regras ANVISA, pre-visualizacao, exportacao, persistencia de tabelas, ingredientes customizados, importacao de fichas tecnicas por IA e um modulo enterprise para projetos internacionais.

Stack principal:

- Next.js 16 com App Router
- React 19
- TypeScript
- Prisma
- PostgreSQL
- NextAuth
- Tailwind CSS
- Gemini API para importacao de fichas tecnicas
- Open Food Facts como apoio para importacao de ingredientes por produto

## 2. Raiz da aplicacao

```text
calculadora-nutricional/
├── Dataset/                 Bases, templates e referencias
├── docs/                    Documentacao organizada por area
├── prisma/                  Schema e migrations Prisma
├── public/                  Arquivos publicos
├── scripts/                 Seeds e utilitarios
├── src/                     Aplicacao Next.js
├── README.md
├── package.json
├── next.config.ts
└── tsconfig.json
```

Arquivos locais e temporarios nao devem entrar no Git: `.env*`, `.next/`, bancos locais, logs, `docs/reports/` e saidas de diagnostico.

## 3. Documentacao

```text
docs/README.md                         Indice da documentacao
docs/system/                           Documentacao geral do sistema
docs/architecture/                     Estrutura e decisoes de organizacao
docs/operations/                       Deploy, importadores e guias operacionais
docs/database/sql/                     SQL manual organizado por ordem de execucao
docs/references/                       Materiais de referencia e documentos anexos
docs/reports/                          Relatorios locais gerados por validacoes
docs/documento-de-commits.md           Plano operacional de commits
```

Os SQL originais do Prisma continuam em `prisma/migrations/`. A pasta `docs/database/sql/` contem copias organizadas para DBA ou execucao manual.

## 4. Arquitetura de codigo

```text
src/app/                  Rotas, paginas e APIs
src/features/             Dominios funcionais
src/components/ui/        Componentes genericos
src/lib/                  Auth, Prisma, exportacao e utilitarios
src/proxy.ts              Protecao das rotas de dashboard via NextAuth
```

Dominios em `src/features/`:

```text
auth                      Cadastro e autenticacao
ingredients               Ingredientes, importacao/exportacao e tela de gestao
open-food-facts           Busca/importacao por Open Food Facts
profile                   Perfil e senha
tables                    Gerador, calculo, persistencia e exportacao de tabelas
technical-sheets          Importador de fichas tecnicas por IA
enterprise                Projetos enterprise e rotulo internacional
i18n                      Idioma global da interface
saas                      Organizacao, planos, modulos e permissoes por participante
billing                   Checkout, portal e webhook de assinatura
marketing                 Eventos de funil, KPIs e palavras-chave
```

Convencao interna:

- `actions/`: server actions.
- `components/`: componentes especificos da feature.
- `domain/`: regras, tipos e normalizadores.
- `services/`: integracoes e servicos de infraestrutura da feature.
- `pages/`: composicao de pagina reutilizada por rotas.

## 5. Rotas de pagina

Publicas:

```text
/                         Home
/login                    Login
/register                 Cadastro
```

Protegidas:

```text
/dashboard                                      Tabelas salvas
/dashboard/new                                  Nova tabela
/dashboard/edit/[id]                            Edicao de tabela salva
/dashboard/ingredients                          Ingredientes
/dashboard/ingredients/my-ingredients           Ingredientes do usuario
/dashboard/ingredients/technical-sheets         Fichas tecnicas importadas
/dashboard/enterprise                           Workspace enterprise
/dashboard/profile                              Perfil e seguranca
/dashboard/debug                                Diagnostico interno
```

## 6. APIs

```text
/api/auth/[...nextauth]             Autenticacao NextAuth
/api/export/excel                   Exportacao Excel
/api/export/complete                Pacote ZIP completo
/api/open-food-facts/products       Busca no Open Food Facts
/api/debug-auth                     Diagnostico de autenticacao
/api/debug/force-migrate            Suporte operacional de migracao
```

## 7. Banco de dados

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

O schema fonte fica em `prisma/schema.prisma`.

Migrations atuais organizadas para execucao manual:

```text
docs/database/sql/001_technical_sheet_imports.sql
docs/database/sql/002_technical_sheet_technical_fields.sql
docs/database/sql/003_enterprise_label_projects.sql
```

Scripts avulsos antigos:

```text
docs/database/sql/900_generated_table_ui_state_dynamic_schema.sql
docs/database/sql/901_generated_table_ui_state_fixed_schema.sql
```

## 8. Fluxos criticos

### Tabela nutricional

1. Usuario cria ou abre uma tabela.
2. Seleciona ingredientes, porcao, medida caseira, embalagem e regras.
3. `features/tables/domain/nutrients.ts` calcula nutrientes.
4. `features/tables/domain/anvisa.ts` aplica regras e arredondamentos.
5. `TableGenerator` e `NutritionalLabel` renderizam a experiencia.
6. `table-actions.ts` salva a tabela e o estado completo da UI no banco.

### Ingredientes

1. Usuario cadastra manualmente, importa por Excel ou busca no Open Food Facts.
2. Ingredientes proprios ficam em `CustomIngredient`.
3. Ingredientes oficiais/importados ficam em `Ingredient`.

### Fichas tecnicas por IA

1. Usuario envia PDF ou imagem.
2. O servidor valida arquivo e chama Gemini.
3. O JSON extraido fica preservado em `TechnicalDocument`.
4. Nutrientes, alergenicos e campos tecnicos viram registros revisaveis.
5. Aprovacao humana cria ou atualiza ingrediente customizado.

### Enterprise

1. Usuario abre uma tabela base.
2. Cria projeto por mercado internacional.
3. O sistema salva versoes, snapshots, dados legais, validacoes e historico de aprovacao.
4. A interface permite revisar rotulo internacional e estado de aprovacao.

## 9. Manutencao

- Regras de negocio devem nascer em `src/features/<feature>/domain`.
- Rotas em `src/app` devem orquestrar, nao concentrar regra.
- Alteracao de schema precisa atualizar `prisma/schema.prisma`, migrations e, quando necessario, `docs/database/sql/`.
- Mudancas em documentos operacionais devem manter `docs/README.md` e `docs/documento-de-commits.md` sincronizados.
- `src/middleware.ts` foi substituido por `src/proxy.ts`; nao recriar middleware antigo sem necessidade.
