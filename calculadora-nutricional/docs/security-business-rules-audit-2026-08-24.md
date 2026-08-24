# Auditoria de fronteiras de negócio e segurança

Data da revisão: 24 de agosto de 2026
Escopo: worktree `Projeto-Rotulagem-security-regras-negocio`, branch `security/regras-negocio-backend`, base `8cb5e1719ec791c0fc46f1953470741145d61030`
Resultado do código no escopo: **APROVADO NO ESCOPO**
Validação do ambiente remoto de produção: **INCONCLUSIVA** (nenhum deploy, banco remoto ou teste ativo externo foi autorizado)

## Resumo executivo

A revisão encontrou regras com impacto de segurança que eram decididas ou aceitas pelo navegador. As falhas de maior impacto permitiam: elevação administrativa entre organizações, redefinição indevida da senha de um `OWNER`, adulteração de nutrientes em snapshots e documentos exportados e aprovação final Enterprise sem autoridade administrativa.

Essas fronteiras foram corrigidas de maneira idiomática para Next.js com TypeScript:

- Server Components consultam e minimizam dados para renderização;
- Server Actions e Route Handlers reautenticam, autorizam, validam entradas e recompõem valores autoritativos;
- serviços de infraestrutura usam `server-only`;
- schemas Zod validam dados em runtime nas fronteiras públicas;
- DTOs por seleção explícita impedem que modelos Prisma e metadados internos cheguem ao cliente;
- funções puras de domínio podem ser compartilhadas com a prévia, mas o servidor continua sendo a autoridade antes de persistir ou gerar documentos oficiais.

Não foi introduzida uma arquitetura Java artificial. As responsabilidades foram separadas conforme o App Router: `components` para interação, `domain` para regras puras, `actions`/`route.ts` para fronteiras públicas e `services` para infraestrutura exclusivamente server-side.

## Cobertura e método

O repositório tinha 341 caminhos versionados na base. Foram inventariados também os novos arquivos desta correção, totalizando 366 arquivos físicos de projeto no momento da revisão, distribuídos em 162 diretórios, sem contar `.git`, `node_modules` e `.next`.

Foram percorridos:

- todo `src` (App Router, 13 Route Handlers, 10 módulos de Server Actions, 61 módulos cliente, componentes, hooks, domínio, serviços e bibliotecas);
- schema Prisma e todas as migrations;
- scripts de build, validação, seed e operação;
- configurações Next, TypeScript, ESLint, Tailwind, proxy, CI e Dependabot;
- documentação, datasets regulatórios e artefatos públicos;
- manifestação e lockfile de dependências.

Arquivos texto foram lidos e pesquisados por fluxo de dados, autoridade, autenticação, autorização, escopo de organização, validação runtime, persistência e exportação. Binários (`png`, `svg`, `xlsx`, `pdf`, `docx`, `psd`) foram classificados por tipo e uso; não foram interpretados como código executável. O arquivo `.env` local foi verificado apenas pelo nome das variáveis, sem imprimir valores ou segredos.

Os limites confiáveis foram traçados do navegador até Server Actions/Route Handlers, Prisma e exportadores. As restrições visuais foram tratadas somente como experiência de uso: segundo a orientação oficial do Next.js, ocultar controles no cliente não substitui a verificação de autorização no servidor.

Referências principais:

- Next.js, Authentication: https://nextjs.org/docs/app/guides/authentication
- Next.js, Data Security: https://nextjs.org/docs/app/guides/data-security
- OWASP, Broken Access Control: https://owasp.org/Top10/A01_2021-Broken_Access_Control/
- OWASP, Input Validation: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html

## Matriz de acesso verificada

| Cenário | Consulta protegida | Mutação | Recurso de outro tenant | Operação administrativa global |
| --- | --- | --- | --- | --- |
| Visitante | Negada/redirecionada | Negada | Negada | Negada |
| Usuário sem organização/membro ativo | Negada | Negada | Negada | Negada |
| Membro inativo | Negada | Negada | Negada | Negada |
| Membro sem módulo efetivo | Negada | Negada | Negada | Negada |
| Membro com módulo efetivo | Permitida no tenant | Permitida no tenant e dentro da função | Negada por `organizationId` derivado da sessão | Negada |
| Administrador comum da organização | Permitida conforme perfil | Permitida conforme perfil e hierarquia | Negada | Negada |
| `OWNER` | Permitida no tenant | Permitida conforme hierarquia | Negada | Negada |
| Master interno configurado no servidor | Permitida | Permitida conforme controles globais | Permitida somente nos fluxos globais explícitos | Permitida |
| ID inexistente ou fora do tenant | Não encontrado/sem permissão | Sem alteração | Negada | Negada |

O tenant nunca é aceito de `FormData`, JSON ou query string como fonte de autoridade. Ele é obtido da sessão e do contexto SaaS no servidor.

## Achados corrigidos

### SBR-001 — Escalada administrativa entre organizações

Severidade original: **Crítica**
Status: **Corrigido**

Um perfil `ADMIN` existe por padrão em cada organização. A combinação de módulo `SETTINGS` com esse perfil era interpretada como autoridade global, permitindo a um administrador comum consultar e administrar outros tenants.

Correção: a autoridade global agora exige identidade master interna configurada por `INTERNAL_MASTER_EMAILS` no servidor. Perfil e módulo continuam governando apenas a organização corrente. Há regressão que prova a negação ao administrador comum.

Arquivos principais:

- `src/features/master/domain/master-identity.ts`
- `src/features/master/services/master-access.ts`
- `src/features/settings/services/organization-settings.ts`

### SBR-002 — Redefinição de senha acima da hierarquia

Severidade original: **Alta**
Status: **Corrigido**

Um membro com acesso delegado a Configurações podia acionar a redefinição administrativa da senha de `ADMIN` ou `OWNER`.

Correção: a matriz de credenciais foi centralizada e aplicada novamente dentro da Server Action. `OWNER` pode redefinir `ADMIN`/`MEMBER`; `ADMIN` pode redefinir apenas `MEMBER`; a própria conta deve usar senha atual e 2FA; master interno é a exceção global explícita. O front apenas reflete essa decisão e não é a barreira de segurança.

Arquivos principais:

- `src/features/settings/domain/credential-management.ts`
- `src/features/settings/actions/settings-actions.ts`
- `src/app/dashboard/settings/page.tsx`

### SBR-003 — Nutrientes Enterprise aceitos do navegador

Severidade original: **Alta**
Status: **Corrigido**

O salvamento Enterprise aceitava o snapshot completo enviado pelo cliente. Um request manual podia manter um `baseTableId` válido e substituir itens e nutrientes.

Correção: o servidor carrega a tabela base com escopo de tenant e recompõe a fórmula e os nutrientes. Somente campos de localização expressamente editáveis são aproveitados do draft. Validações, linhas nutricionais e alertas são recalculados sobre o snapshot confiável.

Arquivos principais:

- `src/features/enterprise/domain/enterprise.ts`
- `src/features/enterprise/actions/enterprise-label-actions.ts`

### SBR-004 — Planilha e memorial aceitavam cálculos do cliente

Severidade original: **Alta**
Status: **Corrigido**

Os endpoints de Excel/pacote recebiam valores `per100g` e `perPortion` calculados no navegador. O memorial recalculava parte da receita, mas ainda confiava nos nutrientes dos ingredientes de preparo presentes em `uiState`.

Correção: os DTOs públicos de exportação aceitam apenas `tableId` e, quando aplicável, bytes limitados de imagem. Um serviço `server-only` carrega tabela e ingredientes do tenant, resolve referências persistidas, aplica overrides permitidos e recalcula os documentos. A persistência de `uiState.preparationIngredients` agora grava snapshots recompostos de registros autorizados.

Arquivos principais:

- `src/features/tables/services/authoritative-export.ts`
- `src/app/api/export/excel/route.ts`
- `src/app/api/export/complete/route.ts`
- `src/app/api/export/memorial/route.ts`
- `src/features/tables/actions/table-actions.ts`

### SBR-005 — Aprovação final Enterprise sem autoridade suficiente

Severidade original: **Alta**
Status: **Corrigido**

Qualquer participante com o módulo Enterprise podia enviar `approvalStatus: approved`.

Correção: o status final exige acesso efetivo a `SETTINGS`, verificado no servidor. A opção também é desabilitada na interface para manter o comportamento compreensível.

### SBR-006 — Histórico de exportação Enterprise adulterável

Severidade original: **Alta**
Status: **Corrigido**

O payload gravado como metadado de exportação vinha do navegador. O servidor agora exige a versão corrente do projeto, confirma tenant/projeto/versão e compõe o registro exclusivamente com campos persistidos.

### SBR-007 — Modelo Prisma e metadados internos entregues ao cliente

Severidade original: **Média**
Status: **Corrigido**

Ingredientes customizados eram serializados a partir do modelo Prisma completo, expondo campos como `userId`, `organizationId` e IDs internos de documentos de origem.

Correção: `IngredientDto` possui whitelist explícita; as consultas server-side usam `select` mínimo e o mapper remove qualquer propriedade adicional. Componentes, cálculos e Open Food Facts dependem do DTO puro, não de `@prisma/client`.

Arquivos principais:

- `src/features/ingredients/domain/ingredient-dto.ts`
- `src/features/ingredients/services/ingredient-dto.ts`

### SBR-008 — Valores nutricionais inválidos convertidos silenciosamente em zero

Severidade original: **Média**
Status: **Corrigido**

Entradas inválidas, negativas ou excessivas podiam cair em coerção numérica e ser persistidas como zero. O parser agora diferencia campo vazio de campo inválido, aceita vírgula decimal e rejeita `NaN`, infinito, negativos e valores acima do limite antes da mutação.

### SBR-009 — Porção, fração e porções por embalagem somente no componente

Severidade original: **Média**
Status: **Corrigido**

As regras de embalagem individual, limiar de duas porções, fração irredutível e quantidade automática de porções estavam implementadas no componente cliente.

Correção: as funções foram movidas para domínio puro e a Server Action recalcula os campos antes de persistir. A interface reutiliza as mesmas funções somente para resposta imediata.

### SBR-010 — Aceite legal inconsistente no primeiro login OAuth

Severidade original: **Média**
Status: **Corrigido no fluxo técnico**

O cadastro por credenciais exigia aceite, mas o primeiro login OAuth criava o usuário sem os campos correspondentes. Os botões OAuth agora apresentam a declaração de continuidade e o callback server-side grava a versão vigente. A suficiência jurídica da forma de consentimento deve continuar sendo validada pelo responsável legal do produto.

### SBR-011 — Ausência de barreiras automatizadas contra regressão arquitetural

Severidade original: **Média**
Status: **Corrigido**

O `security:check` agora falha quando:

- componente cliente importa Prisma, `lib/prisma` ou serviço de infraestrutura;
- módulo de domínio depende do modelo Prisma;
- arquivo em `actions` não declara `use server`;
- serviço com infraestrutura não declara `server-only`;
- Route Handler mutável não aplica a defesa de mesma origem;
- superfícies de debug ou sinks perigosos conhecidos reaparecem.

### SBR-012 — Elevação indireta por troca de perfil e gestão de membros

Severidade original: **Alta**
Status: **Corrigido**

Um participante delegado com `SETTINGS` podia trocar o próprio perfil, atribuir a outro membro um perfil com permissões superiores às suas ou alterar o ciclo de vida de um papel hierarquicamente superior.

Correção: as Server Actions agora impedem autogerenciamento, respeitam `OWNER > ADMIN > MEMBER` e exigem que perfis atribuídos ou criados por um `MEMBER` sejam subconjunto das permissões efetivas do ator. Perfis sistêmicos `OWNER`/`ADMIN` não podem ser alterados por um membro delegado. A exceção global continua limitada ao master interno configurado no servidor.

### SBR-013 — Contrato de identidade misturava pessoa física e jurídica

Severidade original: **Média**
Status: **Corrigido**

O formulário exibia razão social, nome fantasia e CNPJ mesmo quando o cadastro era de pessoa física. A interface agora solicita somente nome completo e CPF para `INDIVIDUAL`, e somente razão social, nome fantasia e CNPJ para `COMPANY`. A Server Action valida o mesmo discriminante, descarta campos do tipo oposto e armazena CPF/CNPJ apenas como hash e quatro últimos dígitos. Foi criada migration aditiva para a identidade individual da organização; ela não foi aplicada a nenhum banco nesta auditoria.

## Regras que podem existir no bundle cliente

Nem toda regra no cliente é uma vulnerabilidade. Formatação, habilitação visual, prévia nutricional, desenho da lupa e mensagens de conformidade precisam responder imediatamente ao usuário. Essas funções podem permanecer em módulos puros compartilhados desde que:

1. não contenham segredo;
2. não sejam a única autorização;
3. o servidor valide novamente entrada, tenant e permissão;
4. valores persistidos e documentos autoritativos sejam recompostos no servidor.

O objetivo de segurança não é esconder a fórmula no JavaScript. Um atacante sempre pode alterar o bundle, o DOM e a requisição. O objetivo é tornar essa alteração incapaz de influenciar dados confiáveis.

## Limites e riscos residuais

### Artefatos PNG/SVG gerados no navegador

Status: **Risco aceito no escopo atual / não autoritativo**

PNG e SVG são capturas da prévia local e permanecem editáveis ou substituíveis depois do download. Isso não pode ser impedido por uma regra frontend. Planilhas, memoriais e snapshots persistidos usam a fonte autoritativa server-side; o histórico Enterprise agora registra somente metadados da versão persistida.

Se o produto passar a afirmar autenticidade criptográfica de imagens, será necessário um fluxo adicional de renderização server-side e assinatura/hash verificável. Esse requisito não existe no modelo atual e não foi inventado nesta correção.

### Etapas intermediárias do workflow Enterprise

Status: **INCONCLUSIVO como segregação departamental**

O modelo atual não representa departamentos nem permissões distintas para Qualidade, Regulatório e Marketing. A aprovação final está protegida por `SETTINGS`, mas as etapas intermediárias continuam colaborativas para quem possui o módulo Enterprise. Se essas etapas tiverem valor jurídico ou exigirem segregação de funções, o produto precisa definir uma matriz de papéis antes da implementação.

### Ambiente e integrações externas

Status: **INCONCLUSIVO fora do ambiente local**

Não foram executados deploy, aplicação de migration, escrita remota, OAuth real, envio de e-mail, cobrança, Gemini ou Open Food Facts ativo. `.env.example` e a documentação de deploy exigem `NEXTAUTH_URL`; a configuração efetiva do ambiente publicado deve ser confirmada antes da liberação sem expor valores sensíveis.

### Versões Enterprise anteriores à correção

Status: **INCONCLUSIVO quanto à origem histórica dos dados**

Novas versões são recompostas da tabela-base no servidor. Versões gravadas antes desta correção não possuem um marcador que permita distinguir um snapshot legítimo de um request adulterado. Elas não foram reescritas automaticamente, porque trocar nutrientes históricos pela tabela-base atual destruiria a fidelidade de versão. Projetos Enterprise antigos que tenham valor regulatório devem ser revisados e salvos novamente em fluxo controlado.

## Evidências de validação

Executado na worktree isolada:

```text
npm ci --ignore-scripts                         PASSOU (647 pacotes)
npm run check                                  PASSOU
  ESLint                                       PASSOU
  TypeScript --noEmit                          PASSOU
  validation boundary checks                   PASSOU
  testes existentes e de identidade            40/40
  regressões de segurança                     16/16
  prisma validate                              PASSOU
npm run security:check                         PASSOU
  security source checks                       PASSOU
  npm audit --audit-level=moderate             0 vulnerabilidades conhecidas
npm run build                                  PASSOU
  Next.js 16.2.12, 30 páginas, 13 rotas API
smoke de produção em 127.0.0.1:3310         PASSOU
  GET /                                        200
  GET /api/health                              200 {status: ok}
  GET /dashboard sem sessão                   307 para /login
git diff --check                               PASSOU
```

O smoke validou inicialização, headers de segurança, healthcheck e proteção de rota sem sessão. Fluxos autenticados e integrações externas permanecem fora da evidência local.

## Critério de liberação

Não restou achado Crítico ou Alto aberto no código revisado. A branch está **APROVADA NO ESCOPO** para revisão e integração, condicionada a:

1. revisão humana do diff e dos papéis de produto;
2. confirmação das variáveis efetivas no ambiente publicado;
3. smoke autenticado no ambiente de integração;
4. manutenção da distinção entre prévia editável e artefato autoritativo.
