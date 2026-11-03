# Gate da Etapa 11 — Privilégios e suporte

Data: 28/08/2026
Resultado: `GATE: APROVADO NO ESCOPO LOCAL`
Banco do gate: `127.0.0.1:54329/calculadora_nutricional`
Neon/produção: não acessados nesta etapa

## Evidência determinística

| Cenário | Resultado |
| --- | --- |
| primeiro TOTP | aceito e time step persistido |
| replay do mesmo TOTP | rejeitado |
| permission/destino/browser corretos | sessão aceita |
| binding diferente | sessão invisível |
| autoaprovação CRITICAL | rejeitada no domínio e no PostgreSQL |
| maker/checker distintos | pedido ativado com aprovador persistido |
| ação HIGH real | suspensão da organização autorizada |
| hidden ID adulterado | outra organização permaneceu inalterada; ação negada |
| auditoria | ação efetiva ligada ao `privilegedSessionId` |
| suporte | sessão metadata-only; nenhum conteúdo ou impersonation |
| revogação | efeito imediato e indicador removido |

Saída do runtime:

```json
{"target":"127.0.0.1:54329","totpReplayRejected":true,"scopeAccepted":true,"crossBindingRejected":true,"makerCheckerPersisted":true,"selfApprovalRejected":true,"auditLinked":true}
```

## Gates

| Gate | Resultado |
| --- | --- |
| `npm run check` | aprovado; 126 testes e Prisma validate |
| `npm run security:check` | aprovado; source guardrails e 0 vulnerabilidades `moderate+` |
| `npm run test:migrations` | aprovado; 54 tabelas, 30 enums, 32 migrations, 73 role grants, upgrade histórico e sem drift |
| `npm run verify:privileged-sessions:runtime` | aprovado no PostgreSQL local |
| `npm run build` | aprovado; 42 páginas, incluindo privileged sessions |
| browser 1440 px / 390 px | HIGH, CRITICAL, suporte, audit, light/dark, teclado e sem overflow |
| `git diff --check` | aprovado antes do registro documental final |

## Limites preservados

O MVP não dá acesso a conteúdo do cliente e não implementa impersonation.
Refund e reset administrativo de 2FA permanecem sem ação mutável; possuir a
permission ou ativar a sessão não cria capability inexistente. Asaas Sandbox e
qualquer operação de produção continuam desligados.
