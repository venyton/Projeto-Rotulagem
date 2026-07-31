# Melhorias aplicadas — 30/07/2026

## Escopo

Rodada aplicada no checkout atual, sem deploy, push ou escrita em banco remoto. As
alterações existentes no working tree foram preservadas.

## Segurança e dependências

- Atualizados `next` para `16.2.12`, `next-auth` para `4.24.15` e
  `eslint-config-next` para `16.2.12`.
- Fixados via `overrides` versões corrigidas de `minimatch`, `postcss`, `sharp` e
  `uuid`.
- `npm audit --audit-level=moderate` passou com zero vulnerabilidades.
- Restringidos os `remotePatterns` de imagens por caminho em `next.config.ts`.
- Adicionado limite total de lote para importação de fichas técnicas.

## APIs e exportação

- Criado schema Zod compartilhado para exportação Excel e pacote completo.
- Nutrientes, listas, constituintes, imagens e nomes de modelos agora possuem
  limites e validação de finitude/intervalo.
- A exportação completa chama diretamente o serviço de geração Excel, sem
  requisição HTTP interna dependente de `APP_URL`.
- Chamadas ao Open Food Facts receberam timeout de 10 segundos e logging sem dados
  sensíveis.

## Documentos técnicos e experiência de download

- Adicionados exports independentes de Memorial de cálculo e Ficha técnica em
  PDF e XLSX.
- O Memorial preserva composição por componente, contribuições, micronutrientes,
  resultados consolidados e verificações sem expor fórmulas internas.
- A Ficha técnica reúne campos do produto, especificações de qualidade,
  informação nutricional, logística, revisões e aprovações.
- A Central de exportação da tela foi reorganizada por finalidade: rótulo,
  documentos técnicos e formatos adicionais.
- O XLSX do Memorial foi reduzido à aba de uso do cliente; orientações internas
  ao programador não são entregues ao usuário.

## Multiempresa e banco

- Criado seletor de workspace para usuários com múltiplas organizações.
- A organização ativa é validada contra a associação do usuário e guardada em
  cookie `httpOnly`, `sameSite=lax`.
- O contexto SaaS deixou de criar entitlements durante leituras de páginas.
  Provisionamento de entitlements ausentes ocorre no login, com fallback em memória
  durante a transição.
- Listagens receberam limites de retorno: tabelas, ingredientes, fichas técnicas,
  projetos empresariais e tokens.
- Tabelas e fichas técnicas receberam paginação com contagem total e navegação
  anterior/próxima.
- A migration `20260727120000_add_table_item_source` permanece append-only e tem
  cópia manual documentada em `docs/database/sql/902_table_item_source.sql`.

## CI, testes e operação

- Adicionados scripts `typecheck`, `test` e `check` ao `package.json`.
- O CI agora executa auditoria, lint, TypeScript, testes, Prisma validate,
  e build. A verificação HTTP de runtime permanece separada porque exige um
  servidor iniciado e banco de teste isolado.
- Adicionados testes de contrato para schemas de exportação e testes de cálculo
  para base de 100 g, porção, açúcar adicionado e quantidades inválidas.
- Removido o `MutationObserver` global de traduções; a tradução é reaplicada por
  idioma e navegação, evitando varredura contínua do DOM.
- Editor de tabelas, workspace enterprise e revisão de fichas técnicas passaram a
  ser carregados em chunks por rota; ExcelJS também ficou sob demanda nas telas de
  ingredientes.
- Adicionados `/api/health` e `/api/ready`.
- Adicionado logger JSON mínimo para readiness, autenticação e Open Food Facts.
- Adicionado PostgreSQL local isolado em `127.0.0.1:54329`, com bootstrap seguro,
  migrations locais e bloqueio do verificador runtime contra URLs remotas.
- O runbook de deploy agora separa ambientes, exige backup/migration deploy e
  documenta smoke tests pós-publicação.

## Segunda varredura completa

- O contexto SaaS deixou de provisionar workspace durante leituras; a criação
  continua limitada ao cadastro/login e o caminho de leitura permanece sem
  efeito colateral.
- O componente `Button` passou a usar `type="button"` por padrão, evitando
  submits acidentais em formulários; submits intencionais continuam declarados
  como `type="submit"`.
- A busca de tabelas passou a ser server-side, preservando o termo na
  paginação. Paginações também limitam páginas absurdamente grandes e usam
  botões realmente desabilitados nos limites.
- Linhas de fichas técnicas agora são acessíveis por teclado e os estados de
  erro/not-found têm recuperação e retorno para o início.
- Open Food Facts ficou sem escrita em consultas GET; a persistência só ocorre
  no POST explícito de importação. Códigos, imagens HTTPS e hosts externos
  permitidos são validados, e respostas privadas usam `no-store`.
- Limites de corpo, cache e frequência foram reforçados em endpoints sensíveis;
  `lastUsedAt` de tokens da API não é atualizado a cada requisição.
- A importação XLSX no navegador agora bloqueia arquivos acima de 10 MB e mais
  de 1.000 linhas antes do envio, mantendo o limite equivalente no servidor.
- O limite máximo de senha foi centralizado em 256 caracteres, refletido nas
  telas de cadastro/reset e coberto por testes de fronteira.
- O menu de conta móvel também permite trocar workspace; novos textos e estados
  foram incorporados ao catálogo de traduções da interface.
- O editor permite declarar manualmente micronutrientes opcionais por 100 g/ml;
  a porção é recalculada, o valor é persistido no projeto e reaparece no preview
  e nas exportações.

Durante a revisão do gate, foi corrigido o caminho dos testes compilados no
`package.json`: eles eram gerados dentro de `features/`, mas o comando tentava
executar um caminho sem esse diretório. A suíte passou a executar os 18 testes
reais.

## Cache e busca de ingredientes

- Consultas ao Open Food Facts foram isoladas em `open-food-facts-cache.ts` e
  passaram a usar o Data Cache do Next via `unstable_cache`, sem depender do
  cache de `fetch` de uma rota `force-dynamic`.
- Busca por nome usa TTL de 10 minutos; consulta por código de barras usa TTL de
  24 horas. A resposta continua privada para o usuário e somente o resultado
  normalizado da fonte externa entra no cache.
- Ingredientes receberam `searchName`, mantido normalizado sem acentos nas
  escritas de seed, criação, edição, importação e Open Food Facts.
- A migration `20260730140000_add_ingredient_search_name` habilita `unaccent` e
  `pg_trgm`, faz o backfill e cria índices GIN para retirar o fallback que
  carregava centenas de ingredientes para filtrar em memória.
- Redis/Upstash não foi introduzido nesta etapa: o cache externo do Next resolve
  a primeira necessidade sem criar nova infraestrutura. Redis permanece indicado
  para rate limit distribuído, locks e cache compartilhado quando o tráfego
  multi-instância justificar o custo operacional.

## Limites de requisição

- O contador persistente passou a consumir tentativas de forma atômica no
  PostgreSQL, eliminando a janela entre consulta e incremento em concorrência.
- Login, cadastro, recuperação/reset de senha, Open Food Facts, exportações,
  tabelas, ingredientes, aprovação/rejeição de fichas técnicas, API por token,
  workspace, módulos, Enterprise, configurações administrativas, Gemini e
  readiness agora têm limites por chave apropriada.
- Respostas HTTP bloqueadas retornam `429` com `Retry-After` e cabeçalhos de
  quota. Limites externos do Open Food Facts deixam de aparecer como `502`.
- Gemini recebeu orçamento global, limite por usuário e retry curto com backoff
  apenas para falhas transitórias.
- Vercel é detectada para limitar payloads e respostas de exportação a 4 MB
  antes do teto de 4,5 MB da plataforma; self-hosted continua configurável por
  ambiente.
- O runbook detalhado está em `docs/operations/RATE_LIMITS.md`.

## Evidência local

Executar na raiz de `calculadora-nutricional`:

```bash
npm run security:check
npm run lint
npm run typecheck
npm test
npx prisma validate --schema=./prisma/schema.prisma
npm run build
```

Com aplicação e banco de teste isolados, execute também:

```bash
MODULE_TEST_BASE_URL=http://127.0.0.1:3100 npm run verify:modules:runtime
```

Nesta rodada, o smoke runtime passou os cenários de páginas, perfil de módulo,
Open Food Facts e módulos embutidos; o health check também respondeu HTTP 200.

Após a segunda varredura, `npm test` passou com 18 testes e `npm run check`
passou novamente com lint, TypeScript, suíte e Prisma validate.

Nenhum comando desta rodada aplicou migration ou alteração em banco remoto.
