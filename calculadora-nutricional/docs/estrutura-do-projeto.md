Estrutura do Projeto

Visão geral da raiz
Arquivos e pastas que devem permanecer na raiz de calculadora-nutricional/:
- package.json, package-lock.json
- next.config.ts, tsconfig.json, eslint.config.mjs, postcss.config.mjs
- vercel.json
- prisma/, public/, scripts/, src/, Dataset/, docs/

Arquivos de ambiente (.env*) e artefatos locais (db/log/report) não devem ser versionados.

Estrutura de código (src/)
- src/app/: rotas do App Router e composição das páginas.
- src/features/: domínio da aplicação organizado por contexto de negócio.
- src/components/ui/: componentes de UI reutilizáveis e genéricos.
- src/lib/: infraestrutura/utilitários transversais.

Domínios atuais em src/features/
- features/auth
- features/ingredients
- features/profile
- features/tables

Convenção dentro de cada domínio
- actions/: server actions do domínio.
- components/: componentes específicos da feature.
- pages/: composição de páginas internas (quando necessário).
- domain/: regras de negócio e constantes do domínio (quando aplicável).

Regras de negócio nutricional
As regras de ANVISA, nutrientes e constantes da tabela ficam em:
- src/features/tables/domain/

Dataset
A pasta Dataset/ está separada por finalidade:
- Dataset/runtime/: arquivos usados efetivamente por scripts de seed/inspeção.
- Dataset/reference/: materiais de apoio (regulatório, exemplos e assets).

Sempre que um arquivo de runtime mudar de lugar, atualizar os scripts em scripts/.

Documentação
- docs/operations/: documentação operacional (ex.: deploy).
- docs/: documentação arquitetural e de organização.
- docs/reports/: reservado para saídas locais de build/lint (ignorado no Git).

Diretrizes de manutenção
1. Código novo de negócio entra em src/features/<feature>.
2. Evitar duplicar regra entre rota app/ e actions de domínio.
3. Não versionar artefatos locais (*.db, logs e relatórios de execução).
4. Usar app/ para orquestração e features/ para lógica da aplicação.
