Este documento resume a reorganização aplicada no projeto e o porquê de cada decisão.
A proposta foi melhorar estrutura e manutenção sem reescrever regras de negócio.

Objetivo da reorganização
- Melhorar legibilidade da base.
- Reduzir código duplicado.
- Deixar responsabilidades mais claras por pasta.
- Preservar compatibilidade com deploy/hospedagem.
- Manter comportamento funcional da aplicação.

O que foi alterado
1) Organização por domínio em src/features
A base foi reorganizada no formato feature-first:
- src/features/auth
- src/features/ingredients
- src/features/profile
- src/features/tables
Motivo:
- Aproxima código técnico do contexto de negócio.
- Reduz tempo para localizar arquivos relacionados.

2) Ações (server actions) separadas por contexto
As actions foram movidas para caminhos semânticos por domínio:
- src/features/auth/actions/register-user.ts
- src/features/ingredients/actions/custom-ingredient-actions.ts
- src/features/ingredients/actions/import-ingredient-actions.ts
- src/features/profile/actions/profile-actions.ts
- src/features/tables/actions/table-actions.ts
Motivo:
- Evita concentração excessiva em arquivos genéricos.
- Facilita manutenção e revisão por área.

3) Regras de negócio saíram de src/lib para domínio
Arquivos de regra nutricional/ANVISA foram para:
- src/features/tables/domain/anvisa.ts
- src/features/tables/domain/constants.ts
- src/features/tables/domain/nutrients.ts
- src/features/tables/domain/micronutrients.ts
- src/features/tables/domain/food-groups.ts
Motivo:
- lib fica dedicado a utilidades transversais.
- Regra de produto fica no domínio correto.

4) Componentes de ingredientes centralizados
Componentes de ingredientes foram agrupados em:
- src/features/ingredients/components/
Inclui:
- AddIngredientForm
- DatabaseFixButton
- IngredientSelector
- IngredientsTable
- ImportIngredientsDialog
- InspectIngredientDialog
Motivo:
- Isola mudanças de uma feature em um único módulo.
- Reduz espalhamento em pastas genéricas.

5) Componentes de tabelas centralizados
Componentes centrais da calculadora foram para:
- src/features/tables/components/
Inclui:
- TableGenerator
- NutritionalLabel
- MagnifyingGlassLabel
Motivo:
- Melhora coesão da feature mais crítica do produto.
- Simplifica evolução de layout e regra de apresentação.

 6) Consolidação da tela de ingredientes
A lógica duplicada de:
- src/app/dashboard/ingredients/page.tsx
- src/app/dashboard/ingredients/my-ingredients/page.tsx
foi consolidada em:
- src/features/ingredients/pages/IngredientsPageContent.tsx
Motivo:
- Um único ponto para manutenção de comportamento.
- Menor chance de regressão por divergência entre telas.

7) Simplificação da comunicação interna
Rotas internas redundantes foram removidas:
- src/app/api/ingredients/list/route.ts
- src/app/api/ingredients/search/route.ts
A feature passou a consumir actions diretamente dentro do fluxo da aplicação.
Motivo:
- Menor superfície de manutenção.
- Menos duplicidade de regra em camadas diferentes.

8) Organização da raiz e documentação operacional
- DEPLOY.md foi movido para docs/operations/DEPLOY.md.
- Foi criado docs/estrutura-do-projeto.md como referência rápida.
- O .gitignore foi atualizado para ignorar docs/reports/, dev.db e *.db.
Motivo:
- Repositório mais limpo e sustentável.
- Artefatos locais não poluem histórico de código.

9) Dataset separado em runtime vs referência
A pasta Dataset/ foi organizada em:
- Dataset/runtime/: arquivos usados por scripts de execução.
- Dataset/reference/: materiais de apoio (regulatório, exemplos, assets).
Scripts de seed/inspeção foram ajustados para os novos caminhos de runtime.
Motivo:
- Evita mistura entre insumo operacional e material de consulta.
- Reduz risco de quebrar scripts por movimentação acidental.

O que não foi alterado
- Regras de cálculo nutricional e lógica regulatória.
- Estrutura principal do banco/Prisma.
- Fluxo público principal da aplicação.
- Estratégia de deploy/hospedagem.

Benefícios práticos
1. Segurança operacional: menos arquivos locais indevidos no Git.
2. Clareza arquitetural: estrutura reflete o domínio do produto.
3. Evolução com menos risco: menos duplicidade e mais isolamento por feature.
4. Onboarding mais rápido: caminhos previsíveis para cada contexto.

Estrutura final (resumo)
- src/app/: rotas e orquestração.
- src/features/: domínio da aplicação.
- src/components/ui/: UI reutilizável.
- src/lib/: utilitários transversais.
- docs/: operação e documentação arquitetural.
- Dataset/runtime e Dataset/reference: separação operacional vs referência.

Conclusão
A reorganização preserva comportamento funcional e melhora a base para manutenção contínua.
Não foi uma mudança cosmética: foi uma redução real de acoplamento e de custo de evolução.
