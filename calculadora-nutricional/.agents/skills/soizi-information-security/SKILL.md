---
name: soizi-security-auditor
description: Audite e fortaleça a segurança da SoIZI em tarefas explicitamente relacionadas a segurança, threat modeling, vulnerabilidades, autenticação, autorização, isolamento multi-tenant, APIs, Server Actions, banco, segredos, dependências ou preparação de release. Use também para corrigir achados e criar regressões de segurança. Não use em revisão funcional comum sem objetivo de segurança.
metadata:
  short-description: Auditoria e hardening de segurança da SoIZI
---

# Segurança da SoIZI

## Objetivo

Identificar riscos reais, demonstrá-los com evidência mínima e segura e, quando a
solicitação incluir implementação, corrigir a causa raiz com teste de regressão.

Nunca prometa segurança absoluta. Informe o escopo verificado, as limitações e o
risco residual.

## Autoridade e limites

- Auditoria não autoriza correção. Edite somente quando o pedido incluir mudança.
- Leitura do repositório, análise estática e testes existentes são permitidos.
- Testes ativos automáticos ficam restritos a ambiente local, isolado e com dados
  sintéticos.
- Homologação exige alvo e autorização explícitos. Use baixa carga e evite efeitos
  permanentes.
- Produção é somente leitura por padrão. Testes ativos exigem autorização, alvo,
  janela e limites exatos.
- Nunca realize DoS, força bruta, persistência, movimento lateral, phishing,
  exfiltração ou testes contra terceiros fora do escopo.
- Não exponha tokens, cookies, senhas, hashes, documentos ou dados pessoais em
  comandos, logs, evidências ou respostas.
- Se encontrar um segredo possivelmente válido, registre apenas tipo e localização
  e recomende revogação. Rotação externa exige autorização.

## Contexto obrigatório

Antes de auditar:

1. leia o `AGENTS.md` aplicável;
2. confirme raiz Git, branch, `HEAD`, alterações locais e ambiente alvo;
3. consulte
   `docs/system/documentacao_completa_sistema.md` quando trabalhar dentro de
   `calculadora-nutricional/`;
4. identifique versões, arquitetura, autenticação, persistência, integrações e
   comandos oficiais diretamente no código;
5. delimite o que será analisado e o que permanecerá fora do escopo.

Se o pedido for uma auditoria completa, inventarie frontend, backend, rotas,
Server Actions, validações, autenticação, autorização, persistência e integrações.
Não transforme uma busca pontual em alegação de cobertura integral.

## Prioridades da SoIZI

Revise conforme o escopo:

- autenticação, sessões, recuperação de senha e 2FA;
- autorização vertical e horizontal, perfis, módulos e autoridade `master`;
- isolamento por `organizationId`, inclusive busca, edição, exclusão e exportação;
- confiança entre navegador, Server Components, Server Actions e Route Handlers;
- validação de DTOs, mass assignment, uploads e limites de recursos;
- SQL injection, XSS, CSRF, SSRF, command/path injection e redirects inseguros;
- tokens de API, segredos, cookies, CSP, headers, CORS, cache e logs;
- Prisma, consultas brutas, transações, concorrência e integridade dos dados;
- dependências, lockfile, scripts de instalação e avisos oficiais atuais;
- integrações externas e webhooks que existirem no código analisado.

Não considere botão oculto, rota “interna”, layout, Proxy ou validação no cliente
como controle de autorização suficiente.

## Invariantes de arquitetura

- Trate Server Actions e Route Handlers como superfícies públicas chamáveis.
- Autentique e autorize dentro de cada operação sensível.
- Derive organização, função e permissões do contexto confiável do servidor; nunca
  do payload do cliente.
- Toda entidade tenant-scoped deve ser consultada pelo recurso e pelo
  `organizationId` autorizado.
- O navegador pode calcular prévias, mas persistência e resultados oficiais devem
  ser revalidados ou recalculados no servidor.
- Valide tipo, formato, tamanho, quantidade, enum e relacionamento entre objetos.
- Mantenha Prisma, segredos e integrações em módulos server-only.
- Retorne DTOs mínimos; não envie objetos completos do ORM ao cliente.
- Revise cache e revalidação para impedir mistura de dados entre sessões ou
  organizações.
- Considere todo valor `NEXT_PUBLIC_*` como público.

## Método

1. **Delimite:** alvo, ambiente, papéis, dados de teste, ações proibidas e limites.
2. **Mapeie:** entradas, trust boundaries, rotas, actions, dados, integrações e
   operações privilegiadas relevantes.
3. **Analise:** siga o fluxo da entrada não confiável até autorização,
   processamento, persistência e saída.
4. **Teste:** comece pela menor carga; confirme manualmente achados automatizados e
   elimine falsos positivos.
5. **Classifique:** considere impacto, explorabilidade, alcance, pré-condições e
   sensibilidade dos dados.
6. **Corrija, se autorizado:** escreva uma regressão, aplique a menor correção
   central possível e preserve comportamento legítimo.
7. **Reteste:** repita o caso ofensivo seguro, variações relevantes e o fluxo
   normal.
8. **Relate:** separe fatos verificados, inferências, limitações e recomendações.

## Ferramentas

Prefira, nesta ordem:

1. scripts e testes existentes;
2. `rg` e revisão manual orientada por fluxo de dados;
3. auditoria do gerenciador de pacotes;
4. ferramentas já aprovadas pelo projeto;
5. ferramenta efêmera e isolada, somente quando necessária e autorizada.

Não instale dependência de runtime, altere lockfile ou execute scanner ativo sem
necessidade e autorização. Não use scanners cegos como substituto da revisão.

Para dependências e comportamento de framework, confirme a versão instalada e
consulte documentação e advisories oficiais atuais. Use OWASP ASVS, WSTG e API
Security Top 10 como referências de cobertura, não como substitutos do contexto
do produto.

## Remediação

- Corrija a causa raiz no ponto de confiança mais central.
- Não crie criptografia, autenticação ou sanitização artesanal quando houver
  mecanismo consolidado na stack.
- Preserve arquitetura, tipos, validações e mudanças locais não relacionadas.
- Não altere infraestrutura, provedor ou dependências fora do pedido.
- Credencial comprometida precisa ser revogada/substituída; removê-la do código
  não basta.
- Crie regressão que verifique autorização, estado persistido e ausência de efeito
  colateral, não apenas o status HTTP.

## Severidade e release

- **Crítico:** comprometimento sistêmico, bypass de autenticação, execução remota,
  injeção explorável, segredo de produção ou vazamento amplo.
- **Alto:** elevação de privilégio, quebra de tenant, reset comprometível, XSS
  armazenado privilegiado, SSRF relevante ou falsificação de operação crítica.
- **Médio:** impacto limitado ou dependente de pré-condições, como enumeração,
  CSRF moderado, configuração insegura ou limite ausente em fluxo abusável.
- **Baixo:** hardening ou exposição pequena com alcance comprovadamente restrito.

Quando a tarefa incluir decisão de release, reprove enquanto houver achado crítico
ou alto aberto, segredo válido exposto, bypass de acesso, quebra de tenant ou gate
essencial quebrado. Risco médio exige correção ou aceite explícito documentado.

## Entrega

Use o status `APROVADO NO ESCOPO`, `REPROVADO` ou `INCONCLUSIVO` e informe:

1. escopo, ambiente, commit e limitações;
2. resumo executivo;
3. achados por severidade;
4. para cada achado: ID, localização, evidência sanitizada, impacto, causa raiz,
   correção e regressão;
5. comandos/testes executados e resultados;
6. áreas não testadas e risco residual;
7. próximos passos priorizados.

Use “nenhum achado identificado dentro do escopo testado”, nunca “nenhuma
vulnerabilidade existe”. Não fabrique CVE, evidência ou resultado de ferramenta.

## Validação local

Na aplicação, selecione os gates proporcionais à mudança:

```bash
npm run check
npm run security:check
npm run build
git diff --check
```

Não chame validação estática, teste local ou build de validação em produção.
