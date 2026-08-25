# Autenticação, segurança e integrações

Leia esta referência quando a tarefa tocar autenticação, autorização, validação,
segredos, headers, uploads, webhooks, APIs externas, abuso ou observabilidade.
Para auditoria ou hardening dedicado, aplique também a skill de segurança do
repositório.

## Identidade e autorização

Use biblioteca madura para hashing, sessão, OAuth/OIDC, MFA e recuperação. Cookies
devem ser `HttpOnly`, `Secure` em produção e ter `SameSite` apropriado; defina
expiração, rotação e invalidação.

Autenticação não substitui autorização. Autorize no ponto da operação por recurso,
propriedade, tenant, papel, permissão, contexto e estado. Não passe token, role ou
tenant pelo cliente quando a sessão puder fornecê-los. `proxy.ts` e middleware
melhoram UX, mas não protegem sozinhos a operação sensível.

## Validação e erros

Valide formulários, params, query, body, headers, env, APIs, webhooks e arquivos
nos limites do sistema. Derive tipos de schemas quando possível; separe criação,
atualização e resposta; normalize entradas, limite payloads e evite coerções
ambíguas. Diferencie validação, 401, 403, 404, 409, 422, 429, indisponibilidade
externa e erro interno. Não exponha stack trace, SQL ou dado sensível.

## Proteções essenciais

- Nunca comite segredos; tudo com `NEXT_PUBLIC_` é público. Valide env e mantenha
  credenciais em módulos server-only.
- Evite `dangerouslySetInnerHTML`; sanitize HTML/Markdown não confiável.
- Configure CSP e headers com origens mínimas, sem copiar política genérica que
  quebre o app ou libere `*`.
- Não trate CORS como autenticação. Preserve origem e cookies corretos.
- Para URL fornecida pelo usuário, valide protocolo/origem, bloqueie redes
  privadas e metadata, limite redirects, tempo e tamanho e não repasse headers.
- Em uploads, valide MIME real, extensão e tamanho; gere nome seguro, bloqueie
  path traversal, use storage privado e nunca execute o arquivo recebido.
- Aplique rate limit proporcional em autenticação, recuperação, cadastro, busca
  cara, upload, mensageria e APIs públicas; considere storage distribuído.
- Não aplique upgrade major ou correção de audit com `--force` cegamente.

## Integrações e webhooks

Encapsule APIs externas em adaptadores que tratem autenticação, URL, timeout,
validação, paginação, rate limit, erros, retry seguro, logs e idempotência.

Em webhooks, preserve o body bruto quando necessário, valide assinatura e
timestamp, bloqueie replay quando possível, registre o evento com chave única,
responda rapidamente e processe trabalho pesado fora da requisição quando houver
infraestrutura. O processamento deve ser idempotente e monitorado.

## Observabilidade

Use logs estruturados com request/trace ID, ação, recurso, resultado e latência.
Nunca registre senha, token, cookie, cartão, documento completo ou payload
sensível. Para fluxos críticos, acompanhe erro, sucesso, latência e dependências
relevantes respeitando privacidade e consentimento.
