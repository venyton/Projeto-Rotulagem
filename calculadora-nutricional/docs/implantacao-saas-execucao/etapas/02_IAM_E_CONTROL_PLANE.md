# Etapa 02 — IAM interno e Control Plane

## Estado

DONE

## Objetivo

Criar roles, permissions, guardas server-side, shell `/admin`, navegação e
auditoria de acesso, mantendo `INTERNAL_MASTER_EMAILS` como bootstrap/break-glass.

## Estado encontrado antes da etapa

O acesso global depende de allowlist por e-mail e compartilha superfícies do
dashboard do cliente. Não existem models de role/permission de plataforma,
guardas granulares, rota `/admin` nem audit event com permission e resultado.

## Documentação oficial obrigatória

- Next.js 16.2.12: Authentication, Proxy e upgrade v16;
- OWASP: Authorization e Logging Cheat Sheets;
- Microsoft Entra: PIM/JIT como referência para assignments temporários;
- shadcn: Sidebar, Card, Badge, Alert, Separator, Button, Dropdown Menu e Avatar;
- referência local `ui-autoexplicativa.md`.

As fontes já consultadas estão registradas em `../FONTES_OFICIAIS.md`. Antes de
usar API ainda não coberta, o contrato oficial será adicionado.

## Checklist

- [x] concluir pesquisa oficial e registrar contratos
- [x] criar models e migration aditiva
- [x] implementar guard deny-by-default
- [x] criar layout e navegação separados
- [x] auditar acesso sanitizado
- [x] adicionar testes negativos de rota e endpoint
- [x] executar gate completo

## Decisão de fronteira

O layout fará a composição e o redirect, mas a autorização segura ficará em
serviço server-only consultando assignments e permissions no banco. Cada Server
Action ou Route Handler administrativo repetirá o guard próximo da mutação. A UI
apenas reflete permissions já autorizadas e não concede autoridade.

## Implementação concluída

- `PlatformRole`, `PlatformPermission`, `PlatformRolePermission` e
  `PlatformAdminAssignment` persistem IAM de plataforma separado do papel tenant;
- nove roles de sistema, 21 permissions e 72 grants explícitos são semeados pela
  migration aditiva `20260825121500_add_platform_iam_foundation`;
- assignments inativos, futuros ou expirados são negados por padrão;
- o break-glass por `INTERNAL_MASTER_EMAILS` exige sessão autenticada e 2FA;
- `resolveCurrentPlatformAccess` e `authorizePlatformRequest` formam a camada
  server-only usada por páginas e pelo endpoint direto `/api/admin/access`;
- acessos autorizados e negados geram evento sanitizado com permission, resultado,
  motivo e correlation ID, sem token, cookie, senha ou segredo;
- `/admin` usa shell próprio e navegação filtrada por permission, sem herdar o
  chrome público ou conteúdo de clientes.

## Testes de segurança e comportamento

- usuário anônimo: endpoint `401` e página redirecionada para login;
- usuário tenant comum: endpoint `403` e `/admin` redirecionado ao dashboard;
- assignment `AUDITOR` ativo: endpoint `200`, acesso à visão geral e auditoria,
  sem link de operadores;
- testes puros cobrem deny-by-default, permission explícita, status/tempo de
  assignment e requisito de 2FA do break-glass;
- fixtures foram criados e removidos somente no PostgreSQL local.

## Critérios de interface aplicados

A referência `ui-autoexplicativa.md` orientou título e escopo explícitos,
consequência visível do isolamento de clientes, origem do acesso, estados vazios
honestos, labels que não dependem de cor e reflow em cartões no mobile. A
inspeção encontrou e corrigiu chrome público herdado, contraste, menu móvel que
permanecia aberto e landmarks duplicados.

## Gate

`GATE: APROVADO` em 25/08/2026. Evidências em
`../evidencias/etapa-02/GATE.md`.
