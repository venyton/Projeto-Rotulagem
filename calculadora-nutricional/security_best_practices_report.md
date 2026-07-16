# Relatório de segurança — calculadora-nutricional

Data da revisão: 2026-07-14

## Resumo executivo

A revisão cobriu autenticação, cookies, tokens, CSRF/origens, autorização por usuário, consultas Prisma, upload, exportação, recuperação de senha, CSP, headers e dependências. Os achados críticos e altos identificados no código foram corrigidos. A aplicação não expõe mais APIs de debug nem usa consultas SQL raw/unsafe; entradas não podem definir a estrutura das consultas Prisma e dados sensíveis de tabelas são reconstruídos no servidor.

Nenhum sistema pode ser declarado “à prova de hackers”. TLS, WAF, limitação de tráfego na borda, gestão e rotação de segredos, backups e monitoramento dependem do ambiente de produção e precisam permanecer ativos fora deste repositório.

## Achados corrigidos

### SEC-001 — SSRF e encaminhamento de cookie por origem controlável

- Severidade: crítica
- Local: `src/app/api/export/complete/route.ts:89`
- Evidência: a exportação agora exige origem confiável, usa a origem canônica configurada e bloqueia redirects (`:91`, `:134-149`).
- Impacto anterior: um Host/origin malformado poderia direcionar a requisição interna e o cookie encaminhado para outro destino.
- Correção: destino fixado em `APP_URL`/`NEXTAUTH_URL`, validação de Origin, timeout, limite de payload e `redirect: error`.
- Mitigação adicional: configurar somente URLs HTTPS controladas em produção.
- Falso positivo: não; o cookie ainda é encaminhado apenas para a origem canônica necessária ao endpoint interno autenticado.

### SEC-002 — IDOR em fichas técnicas

- Severidade: crítica
- Local: `src/features/technical-sheets/actions/technical-sheet-actions.ts:217`
- Evidência: ações públicas obtêm o usuário da sessão e todas as leituras/mutações relevantes filtram `userId` autenticado (`:229`, `:275-278`, `:426-427`, `:595-596`, `:716-717`).
- Impacto anterior: parâmetros opcionais de usuário permitiam tentar acessar dados de outra conta.
- Correção: remoção dos parâmetros públicos de usuário, autorização de módulo e ownership no servidor.
- Mitigação adicional: manter testes de isolamento entre organizações.
- Falso positivo: não.

### SEC-003 — Superfícies de debug e SQL inseguro

- Severidade: alta
- Local: removidos `src/app/api/debug-auth/route.ts`, `src/app/api/debug/force-migrate/route.ts` e `src/app/dashboard/debug/page.tsx`.
- Evidência: não há ocorrências de `$queryRawUnsafe`, `$executeRawUnsafe`, `$queryRaw` ou `$executeRaw` em `src`; `scripts/security-check.mjs` impede regressão.
- Impacto anterior: endpoints de diagnóstico ampliavam exposição de autenticação, erros e estrutura do banco; execução raw enfraquecia a garantia contra injeção.
- Correção: remoção das rotas e uso exclusivo de operações Prisma estruturadas/parametrizadas.
- Mitigação adicional: diagnósticos futuros devem existir somente fora da build de produção e nunca aceitar SQL do cliente.
- Falso positivo: não.

### SEC-004 — Recuperação de senha e proteção de tokens

- Severidade: alta
- Local: `src/app/api/auth/forgot-password/route.ts:13`, `src/app/api/auth/reset-password/route.ts:15`
- Evidência: schemas estritos, resposta sem enumeração, rate limit persistente, token aleatório armazenado em SHA-256, expiração de uma hora e consumo atômico (`forgot-password:29-59`; `reset-password:36-81`).
- Impacto anterior: abuso de envio, enumeração de contas, replay e exposição do token em logs.
- Correção: token bruto existe apenas para entrega; o banco recebe somente o hash; senha usa política central e bcrypt com 12 rounds.
- Mitigação adicional: configurar `RESEND_API_KEY` e `PASSWORD_RESET_FROM_EMAIL`; monitorar picos de solicitação.
- Falso positivo: não.

### SEC-005 — Dados e consultas manipulados pelo cliente

- Severidade: alta
- Local: `src/features/tables/actions/table-actions.ts:15`
- Evidência: payload estrito e limitado (`:15-33`); ingredientes personalizados são filtrados por `userId` (`:87-100`); nutrientes são recarregados do banco e persistidos a partir da fonte confiável (`:118-138`); updates validam ownership (`:143-149`).
- Impacto anterior: o cliente podia enviar snapshots nutricionais adulterados ou IDs de outra conta.
- Correção: allowlist Zod e reconstrução server-side; imports também usam campos explícitos e limites, sem mass assignment.
- Mitigação adicional: nunca aceitar cláusulas Prisma, nomes de coluna ou operadores diretamente do cliente.
- Falso positivo: não.

### SEC-006 — Cookies, sessão, CSRF e headers do navegador

- Severidade: alta
- Local: `src/lib/auth.ts:17`, `src/lib/auth.ts:61`, `src/proxy.ts:4`, `next.config.ts:4`
- Evidência: segredo mínimo de 32 caracteres em produção; cookie de sessão `HttpOnly`, `SameSite=Lax`, `Secure` em produção e prefixo `__Secure-`; sessão/JWT limitados a 12 horas. CSP por nonce, `strict-dynamic`, bloqueio de objetos/frames/base externa e headers de isolamento estão habilitados.
- Impacto anterior: configuração implícita de cookie e CSP permissiva aumentavam risco de roubo de sessão e XSS.
- Correção: defaults seguros e falha fechada quando o segredo de produção é inválido; requisições mutáveis verificam Origin contra allowlist exata.
- Mitigação adicional: manter HTTPS/HSTS na plataforma de hospedagem e nunca definir `SESSION_COOKIE_SECURE=false` em produção.
- Falso positivo: `style-src 'unsafe-inline'` permanece por compatibilidade com estilos inline existentes; scripts não usam `unsafe-inline`.

### SEC-007 — Uploads e consumo de recursos

- Severidade: média
- Local: `src/features/technical-sheets/services/technical-sheet-file-service.ts:1`
- Evidência: allowlist de MIME, tamanho máximo, nome higienizado e validação de magic bytes para PDF/PNG/JPEG/WEBP (`:25-84`); lote limitado entre 1 e 5 arquivos.
- Impacto anterior: tipo declarado podia divergir do conteúdo e lotes grandes ampliavam custo/DoS.
- Correção: validação de conteúdo e limites server-side.
- Mitigação adicional: antivírus/isolamento de arquivos e limites de requisição na borda.
- Falso positivo: magic bytes validam formato básico, não substituem análise antimalware.

### SEC-008 — Dependências vulneráveis e cadeia de suprimentos

- Severidade: alta
- Local: `package.json`, `package-lock.json`, `vercel.json`, `.github/workflows/security.yml`, `.github/dependabot.yml`
- Evidência: `npm audit` retorna zero vulnerabilidades; deploy usa `npm ci`; CI executa auditoria, verificação estática, lint e TypeScript; Dependabot semanal habilitado.
- Impacto anterior: seis advisories transitivos, incluindo severidade alta, e instalação não determinística.
- Correção: dependências transitivas atualizadas, override seguro de `uuid` e lockfile obrigatório.
- Mitigação adicional: revisar PRs automáticos e manter proteção de branch.
- Falso positivo: o resultado do audit é um retrato da data acima e deve ser reexecutado continuamente.

## Riscos operacionais remanescentes

- O limite global de Server Actions permanece em 100 MB por compatibilidade com o fluxo de importação. O upload individual é limitado, mas a borda deve impor limite e timeout próprios.
- `style-src 'unsafe-inline'` deve ser removido gradualmente após migrar estilos inline para classes/nonces.
- Vinculação de contas OAuth merece uma revisão específica por provedor e armazenamento de `providerAccountId`, especialmente se novos provedores forem habilitados.
- WAF, rate limit por IP, HSTS, logs de segurança, alertas, rotação de segredos e restauração de backup não são comprováveis apenas pelo código local.
- Se algum segredo já foi publicado, ele deve ser rotacionado; esta revisão não encontrou segredos versionados, mas não substitui varredura do histórico Git e do provedor de deploy.
