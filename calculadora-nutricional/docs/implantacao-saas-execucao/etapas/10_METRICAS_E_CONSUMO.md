# Etapa 10 — Métricas e consumo

## Estado

DONE

## Objetivo

Criar visibilidade SaaS por tenant e global a partir de dados autoritativos,
incluindo quota mensal efetiva sem aceitar contadores declarados pelo navegador.

## Entregas concluídas

- [x] ledger de consumo idempotente por tenant;
- [x] agregado mensal UTC por tenant e feature;
- [x] unique key por tenant e chave idempotente;
- [x] advisory lock e verificação atômica na borda da quota;
- [x] reset por período sem cron destrutivo;
- [x] instrumentação server-side de IA, API e exportação Enterprise;
- [x] contagens de seats, tabelas, ingredientes, projetos e atividade derivadas das tabelas autoritativas;
- [x] MRR/ARR derivados somente de subscriptions reconciliadas;
- [x] dashboard `/admin/metrics` protegido por `platform.operations.read`;
- [x] visão global e até 25 tenants, sem datasets ilimitados;
- [x] testes de concorrência, deduplicação, reset e isolamento cross-tenant;
- [x] validação visual light/dark, teclado, desktop e 390 px.

## Resultado

Dois consumos concorrentes no limite 2 foram aceitos exatamente uma vez cada;
o terceiro foi negado. Repetir a mesma chave não incrementou o agregado, o
tenant B manteve contador independente e o período seguinte reiniciou em 1.

O dashboard não inventa margem sem custo confiável. O container do Control
Plane foi corrigido para permitir rolagem mobile real.

`GATE: APROVADO` no escopo local. O incidente de ambiente `RISK-012` permanece
aberto e nenhum novo acesso ao Neon foi realizado após sua detecção.
