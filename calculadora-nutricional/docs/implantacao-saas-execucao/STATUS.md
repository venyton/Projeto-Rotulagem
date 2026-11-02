# Status da implantação SaaS

Última atualização: 2026-08-28 -03:00
Branch: `feat/padronizacao-interface-e-governanca`
Commit base: `de730f82bae1b0c225f5863b8d7c663a8e09abdd`

## Etapa atual

Etapa: 12
Nome: Hardening e rollout
Estado: IN_PROGRESS

## Última etapa concluída

Etapa 11 — Privilégios e suporte no escopo local.

## Próxima etapa

Auditoria final integrada e consolidação de go/no-go.

## Gates

| Etapa | Estado |
| --- | --- |
| 00 | DONE |
| 01 | DONE |
| 02 | DONE |
| 03 | DONE |
| 04 | DONE |
| 05 | DONE |
| 06 | DONE |
| 07 | DONE |
| 08 | DONE |
| 09 | DONE |
| 10 | DONE |
| 11 | DONE |
| 12 | IN_PROGRESS |

## Bloqueios atuais

`ASAAS_API_KEY` Sandbox não está presente no ambiente local. Por decisão humana
explícita de 26/08/2026, a homologação externa será executada somente depois da
implementação das etapas 05–12. Até lá, contratos são provados com mocks e banco
local, sem chamadas Asaas. Neon e produção financeira continuam fora do escopo.

`RISK-012` registra um upsert acidental e isolado de fixture no `User` do Neon.
Após a detecção não houve nova consulta nem tentativa de remoção remota; qualquer
remediação exige autorização explícita. Toda execução seguinte usa URLs de
loopback sobrescritas no comando.

## Decisões humanas pendentes

A chave exclusiva do Asaas Sandbox será necessária no gate final de homologação,
sem ser publicada no chat, documentação ou repositório. Também permanece
pendente a decisão explícita sobre inspeção/remoção cirúrgica do registro remoto
descrito em `RISK-012`. Credenciais de produção permanecem proibidas.

## Próxima ação objetiva

Executar a matriz final de hardening, E2E local, autorização/cross-tenant,
feature flags, rollback, observabilidade e critérios formais de go/no-go.
