# Estrutura do Projeto

Atualizado em: 26/04/2026.

## 1) Quem somos hoje (visão do produto)
Este repositório mantém uma aplicação web para geração de rotulagem nutricional com foco em:
- cálculo nutricional por receita (100 g e por porção);
- aplicação de regras ANVISA (incluindo FOP/lupa);
- pré-visualização de múltiplos modelos de tabela;
- exportação em PNG e Excel (e pacote ZIP no fluxo completo);
- persistência de tabelas e ingredientes customizados por usuário.

Stack principal atual:
- Next.js 16 (App Router) + React 19 + TypeScript;
- Prisma + PostgreSQL;
- NextAuth (credenciais) para autenticação;
- Tailwind + componentes UI reutilizáveis.

## 2) Raiz do projeto (`calculadora-nutricional/`)
Arquivos e pastas estruturais:
- `package.json`, `package-lock.json`
- `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`
- `vercel.json`
- `prisma/`
- `src/`
- `public/`
- `scripts/`
- `Dataset/`
- `docs/`

Não versionar artefatos locais:
- `.env*`, bancos locais (`*.db`), logs e saídas temporárias/relatórios locais.

## 3) Arquitetura de código (`src/`)

### 3.1 Camadas
- `src/app/`: rotas App Router (páginas e APIs), composição e orquestração.
- `src/features/`: domínio de negócio por contexto funcional.
- `src/components/ui/`: componentes genéricos e reutilizáveis de interface.
- `src/lib/`: infraestrutura compartilhada (auth, prisma, utilitários e export).

### 3.2 Domínios em `src/features/`
- `auth/`
- `ingredients/`
- `profile/`
- `tables/`

Convenção interna por domínio:
- `actions/`: server actions.
- `components/`: componentes específicos da feature.
- `pages/`: composição de páginas da feature (quando aplicável).
- `domain/`: regras, constantes e cálculo de negócio (especialmente em `tables`).

## 4) Mapa de rotas de página (`src/app`)

Públicas:
- `/` (`src/app/page.tsx`)
- `/login` (`src/app/login/page.tsx`)
- `/register` (`src/app/register/page.tsx`)

Protegidas por autenticação (matcher de middleware):
- `/dashboard`
- `/dashboard/new`
- `/dashboard/edit/[id]`
- `/dashboard/ingredients`
- `/dashboard/ingredients/my-ingredients`
- `/dashboard/profile`
- `/dashboard/debug`

Observação técnica:
- A proteção atual usa `src/middleware.ts` com `withAuth` para `/dashboard/:path*`.

## 5) Mapa de APIs (`src/app/api`)
- `/api/auth/[...nextauth]`: autenticação NextAuth.
- `/api/export/excel`: geração de arquivo Excel oficial por template.
- `/api/export/complete`: geração de pacote ZIP (Excel + imagens).
- `/api/debug-auth`: utilitário de diagnóstico de autenticação.
- `/api/debug/force-migrate`: utilitário de suporte operacional.

Diretório reservado:
- `src/app/api/ingredients/` existe como espaço reservado (sem handlers ativos no momento).

## 6) Dados e persistência
Modelo Prisma central:
- `User`
- `Ingredient` (base principal)
- `CustomIngredient` (ingredientes próprios por usuário)
- `GeneratedTable` (metadados da tabela salva)
- `TableItem` (snapshot dos itens usados na tabela)

Arquivo-fonte do modelo:
- `prisma/schema.prisma`

## 7) Fluxos críticos de negócio

### 7.1 Geração de tabela nutricional
1. Usuário seleciona ingredientes e parâmetros (porção, medida, grupo populacional).
2. `features/tables/domain/nutrients.ts` calcula nutrientes por 100 g e por porção.
3. `features/tables/domain/anvisa.ts` aplica arredondamentos/regras regulatórias e FOP.
4. `features/tables/components/NutritionalLabel.tsx` renderiza a tabela em preview.
5. `features/tables/components/TableGenerator.tsx` orquestra cálculo, seleção de layouts e exportações.

### 7.2 Exportação
- PNG/JPEG/WEBP: captura do preview no cliente (html2canvas).
- Excel oficial: `/api/export/excel` com template em `Dataset/reference/table-examples`.
- Pacote completo: `/api/export/complete` gera ZIP com Excel e imagens.

### 7.3 Ingredientes
- Busca, criação, edição, exclusão e importação de ingredientes customizados via server actions em `features/ingredients/actions`.
- Páginas de ingredientes reutilizam `features/ingredients/pages/IngredientsPageContent.tsx`.

## 8) Dataset, scripts e documentação

### 8.1 Dataset
- `Dataset/runtime/`: insumos usados na execução de scripts.
- `Dataset/reference/`: referência regulatória, exemplos de planilha e assets.

### 8.2 Scripts (`scripts/`)
- Seed e utilitários de banco (`seed.ts`, `seed.js`, `seed-test-user.js`, `test-db.js`, etc.).
- Scripts de inspeção/verificação de dados (`inspect_*`, `check_*`, `verify-login.js`).

### 8.3 Documentação (`docs/`)
- `docs/operations/`: procedimentos operacionais (ex.: deploy).
- `docs/`: documentos arquiteturais, conformidade e evolução.
- `docs/reports/`: reservado para saídas locais de análise/execução.

## 9) Regras de manutenção (estado atual)
1. Nova regra de negócio deve nascer em `src/features/<feature>`.
2. `src/app` deve orquestrar fluxo; regra de domínio fica em `features/*/domain` e `actions`.
3. Evitar duplicação entre API routes e server actions.
4. Manter ordem e nomenclatura nutricional consistentes entre preview e export.
5. Qualquer mudança em templates/dataset deve revisar scripts e endpoints de exportação.
