# Etapa 11 — Privilégios e suporte

## Estado

DONE

## Objetivo

Endurecer ações administrativas HIGH/CRITICAL com elevação JIT curta,
reautenticação MFA, escopo exato, expiração, revogação, maker-checker e
auditoria correlacionada, sem transformar suporte em impersonation.

## Entregas concluídas

- [x] entidade `PrivilegedSession` com requester, permission, destino, propósito,
  justificativa, ticket, duração, vínculo da sessão, MFA, correlação e estado;
- [x] durações permitidas de 5, 10 ou 15 minutos e expiração server-side;
- [x] vínculo por HMAC do cookie NextAuth atual, sem persistir cookie ou token;
- [x] step-up TOTP com rate limit persistido e proteção anti-replay por time step;
- [x] permissões HIGH ativadas imediatamente após MFA válido;
- [x] permissões CRITICAL em `PENDING_APPROVAL`, com aprovador diferente e MFA
  próprio antes da ativação;
- [x] autoaprovação rejeitada também por constraint PostgreSQL;
- [x] revogação imediata e expiração visual automática no header;
- [x] autorização por permission + target type + target ID + browser binding;
- [x] publicação de catálogo, cupom, grant, override e suspensão de organização
  migradas para autorização privilegiada;
- [x] criação/revogação de operadores com proteção do último Platform Owner;
- [x] revogação de assignment também revoga sessões do operador;
- [x] auditoria ligada diretamente ao `privilegedSessionId`;
- [x] tela `/admin/security/privileged-sessions` e indicador global permanente;
- [x] tela de operadores habilitada para mutations CRITICAL;
- [x] suporte limitado a pedido metadata-only; conteúdo e impersonation não
  foram implementados;
- [x] testes de permission, escopo, binding, expiração, revogação, replay,
  cross-scope e maker-checker.

## Resultado

No browser local, uma sessão HIGH vinculada à organização autorizada permitiu a
suspensão e registrou o mesmo `privilegedSessionId` no audit log. A adulteração
do hidden ID para outra organização foi negada antes da mutação. Um pedido
CRITICAL do próprio operador permaneceu pendente e não exibiu autoaprovação.

Uma sessão de suporte apareceu imediatamente no indicador do header, permaneceu
somente metadata e desapareceu após revogação. As fixtures, assignments, sessões
e logs do ensaio foram removidos integralmente do PostgreSQL local.

`GATE: APROVADO` no escopo local. A Etapa 12 pode iniciar; homologação Asaas,
inventário/backup remoto e a decisão sobre `RISK-012` continuam gates humanos.
