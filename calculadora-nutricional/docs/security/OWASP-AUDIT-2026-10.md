# Varredura de segurança OWASP — 6 de outubro de 2026

## Escopo e resultado

Revisão estática do código da aplicação, com inventário dos 23 Route Handlers em
`src/app/api`, Server Actions e serviços que lidam com autenticação, tenants,
administração, exportação, arquivos, webhooks e integrações. Os critérios de
referência são [OWASP Top 10:2025](https://top10.owasp.org/2025/) e
[OWASP API Security Top 10:2023](https://owasp.org/API-Security/editions/2023/en/).

O código e as dependências de produção ficaram mais protegidos, mas esta revisão
não certifica conformidade integral: há um alerta alto sem correção publicada em
dependências de desenvolvimento, configurações externas não foram examinadas e
não foi feito pentest contra um ambiente implantado.

## OWASP Top 10:2025

| Categoria | Estado | Evidência e limite |
| --- | --- | --- |
| A01 — Broken Access Control | Reforçado | Contexto de organização e permissões são derivados da sessão e membership. Consultas/exportações são escopadas por organização; administração usa permissões de plataforma e sessões privilegiadas. A revisão é estática, sem tentativa dinâmica de IDOR em produção. |
| A02 — Security Misconfiguration | Parcial | CSP com nonce, `frame-ancestors`, headers de segurança, cookies de sessão `HttpOnly`/`SameSite=Lax` e `Secure` obrigatório em produção. Proxy próprio precisa sobrescrever `X-Forwarded-For` e definir `TRUST_PROXY_HEADERS=true`; a configuração real do host não foi auditada. |
| A03 — Software Supply Chain Failures | Parcial | Next.js e `eslint-config-next` foram atualizados para 16.3.8; `sharp` para 0.35.5; correções sem breaking change foram aplicadas. `npm audit --omit=dev` retorna zero. O audit completo ainda encontra cinco alertas altos no caminho de desenvolvimento `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`. O advisory do `braces` informa que ainda não há versão corrigida; por isso `npm run security:check` permanece com status de falha até existir patch ou substituição compatível. |
| A04 — Cryptographic Failures | Controle presente; operação pendente | Segredos persistidos usam AES-256-GCM; tokens de API e reset de senha não são persistidos em claro; senhas usam bcrypt. Não foram verificados rotação, armazenamento e backup das chaves no secret manager do ambiente implantado. |
| A05 — Injection | Revisado no código | Entradas das rotas alteradas usam schemas; Prisma é usado com consultas parametrizadas. O scanner não encontrou `$queryRawUnsafe`, `$executeRawUnsafe`, `eval`, `new Function` ou `dangerouslySetInnerHTML`. |
| A06 — Insecure Design | Parcial | Foram observados limites de consumo, gates independentes para billing e operações privilegiadas, idempotência de webhooks e autorização server-side. Uma avaliação completa de ameaça de cada fluxo financeiro e abuso de negócio requer cenários do produto e ambiente de integração. |
| A07 — Authentication Failures | Reforçado; migração pendente | Login possui limitação persistente, comparação fictícia para contas sem senha local, cookies seguros e TOTP com prevenção de replay. Vínculos OAuth agora usam ID estável do provedor e exigem `email_verified: true` quando a identidade ainda não está vinculada. A migration aditiva precisa ser aplicada antes do deploy. Provedores sem essa claim e contas OAuth legadas sem vínculo podem exigir entrada por senha/recuperação; nenhum registro de usuário foi apagado. |
| A08 — Software or Data Integrity Failures | Revisado no código | Webhook Asaas autentica, limita e normaliza payload antes de persistir na inbox; callbacks de checkout não são tratados como confirmação financeira. Migrações são versionadas e a nova migration foi exercitada em instalação limpa e upgrade semeado. |
| A09 — Security Logging & Alerting Failures | Parcial | Ações privilegiadas e falhas de readiness têm trilhas/eventos sanitizados. Não foram verificados centralização, retenção, alertas ou resposta a incidentes fora do código; cobertura de login e uso de API também pode ser ampliada. |
| A10 — Mishandling of Exceptional Conditions | Reforçado | Corpos são lidos com limite real de bytes, não apenas `Content-Length`; UTF-8 inválido, JSON malformado e streams com falha são rejeitados. Respostas de Open Food Facts e Asaas têm limite de tamanho; chamadas externas usam timeout. |

## OWASP API Security Top 10:2023

| Categoria | Estado | Evidência e limite |
| --- | --- | --- |
| API1 — Broken Object Level Authorization | Reforçado | Dados de tenant são consultados com o `organizationId` do contexto do servidor; exclusão e exportação validam a organização. Não foi executado teste adversarial contra todos os IDs em runtime. |
| API2 — Broken Authentication | Reforçado; migration pendente | Tokens API são de alta entropia, guardados por hash e validados por membership, status e entitlement. Login/2FA e reset têm rate limit. Vínculos OAuth passam a ser por identidade persistida do provedor. |
| API3 — Broken Object Property Level Authorization | Revisado no código | As rotas selecionam e retornam DTOs limitados; configurações sensíveis são filtradas e há allowlists para configurações públicas e de usuário. |
| API4 — Unrestricted Resource Consumption | Reforçado | Corpos JSON/webhook têm teto de bytes; listagem API limita paginação; operações caras têm rate limit; chamadas externas têm timeout e respostas limitadas. Limites de planilhas técnicas (20 MB por arquivo e 80 MB por lote) foram preservados. |
| API5 — Broken Function Level Authorization | Reforçado | Operações de plataforma exigem permissão explícita e, para alto risco, sessão privilegiada; ações de tenant verificam acesso ao módulo. Os testes de domínio cobrem a política, mas não substituem teste de autorização HTTP integrado. |
| API6 — Unrestricted Access to Sensitive Business Flows | Parcial | Login, exportação, escrita de workspace, tabelas, ingredientes e revisão de extração têm rate limits; checkout/webhooks têm validação e idempotência. Limites precisam ser ajustados com métricas reais de tráfego e abuso. |
| API7 — Server Side Request Forgery | Revisado no código | Chamadas Asaas e Open Food Facts usam hosts fixos; redirecionamento Asaas não é seguido; URL pública de webhook rejeita hosts locais/endereços IP. A foto Graph do Azure usa destino fixo, rejeita redirects, tem timeout de 2,5 s e limite de 64 KB. |
| API8 — Security Misconfiguration | Parcial | Respostas privadas usam `no-store`, rotas mutáveis verificam `Origin` e o scanner exige corpos limitados. CORS de `/api/v1/tables` é aberto intencionalmente para clientes bearer; headers, gateway, WAF e limites do provedor precisam ser confirmados no deploy. |
| API9 — Improper Inventory Management | Parcial | Os 23 Route Handlers foram inventariados nesta varredura; há rota `/api/v1` separada. Não foi encontrado contrato OpenAPI completo ou processo de desativação/versionamento de endpoints antigos para validar. |
| API10 — Unsafe Consumption of APIs | Reforçado parcialmente | Respostas de Asaas/Open Food Facts são limitadas e validadas; destinos são fixos, há timeout e não há retry cego de POST financeiro ambíguo. Outros serviços externos e credenciais de runtime precisam de verificação de contrato e sandbox em cada integração. |

## Correções implementadas nesta varredura

- `src/lib/security/request-body.ts`: leitor limitado por tamanho real, declarado,
  UTF-8 válido e JSON válido; aplicado nas rotas de autenticação, exportação,
  configurações, workspace, módulos, atribuição de operadores e webhook.
- `src/lib/auth.ts` e `prisma/schema.prisma`: associação por ID estável OAuth,
  sem vincular identidade desconhecida só por coincidência de e-mail; e-mail exige
  claim explicitamente verificada para associação/criação.
- `prisma/migrations/20261006120000_secure_oauth_identities/migration.sql`:
  tabela/índices/FK aditivos; não remove nem reescreve linhas existentes.
- `src/lib/security/request-rate-limit.ts` e
  `src/features/platform-iam/services/privileged-sessions.ts`: endereço de cliente
  usa header confiável da Vercel ou proxy explicitamente confiável.
- `src/app/api/v1/tables/route.ts` e
  `src/features/api-access/services/api-token-auth.ts`: limite por IP antes da
  autenticação de token, quota antes da contabilização e consultas tenant-scoped.
- Respostas externas Asaas/Open Food Facts e a foto opcional do perfil Azure
  passaram a ter consumo limitado; a foto preserva-se quando Graph responde dentro
  de timeout e do teto de 64 KB.
- `scripts/security-check.mjs`: guardrail contra leitura sem limite de corpos em
  rotas API e regressão de vínculo OAuth sem identidade verificada.

## Verificações e preservação

- `npm run check`: passou; inclui lint, TypeScript, fronteiras de validação, testes
  e `prisma validate`. Os testes executados somaram 135 casos. O lint mantém um
  warning não bloqueante de navegação via `window.location.assign` em
  `src/features/tables/components/TableGenerator.tsx`.
- `npm run build`: passou usando Next.js 16.3.8.
- `npm run test:migrations`: passou em banco local descartável tanto para instalação
  limpa como upgrade com dados legados. O cenário preservou usuário, membership,
  tabela nutricional, item, ingrediente customizado, entitlement, plano, billing
  customer, subscription, webhook, evento de marketing e a nova identidade OAuth;
  não deixou FK inválida nem divergência Prisma.
- `node scripts/security-check.mjs`: passou.
- `npm audit --omit=dev --audit-level=moderate`: zero vulnerabilidades.
- `npm run security:check`: falha pelos cinco avisos altos do único caminho
  transitivo de desenvolvimento descrito em A03; o scanner de código executado
  pelo mesmo comando passou. Não foi usado downgrade incompatível nem `--force`.
- `git diff --check`: passou. Nenhum banco remoto foi acessado ou migrado, nenhum
  deploy foi feito e nenhum dado real foi alterado.

## Pendências para fechamento operacional

1. Aplicar a migration OAuth com backup e `prisma migrate deploy` no ambiente
   correto antes de publicar a versão; não usar `prisma db push` em produção.
2. Confirmar os provedores OAuth configurados: identidades sem claim de e-mail
   verificado precisam de um fluxo explícito de vinculação autenticada; contas
   legadas afetadas devem usar senha/recuperação até esse fluxo existir.
3. Acompanhar a correção de `braces` e reexecutar `npm run security:check` quando
   houver versão corrigida compatível com `eslint-config-next` 16.3.8.
4. Confirmar secret manager, proxy confiável, WAF/rate limits, logs centralizados,
   alertas e configuração de headers no ambiente implantado.
