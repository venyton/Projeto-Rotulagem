# Etapa 03 — Catálogo comercial

## Estado

DONE

## Objetivo

Representar o produto comercialmente sem condicionar código a nomes de plano,
preservando versões e preços históricos.

## Estado encontrado

O schema tinha `Plan` e `PlanModule` mutáveis, quatro preços embutidos, referências
Stripe e assinatura ligada apenas ao plano. Não havia feature granular,
`PlanVersion`, preço independente ou proteção contra reescrita histórica.

## Implementação

- migration aditiva `20260825201500_add_versioned_commercial_catalog`;
- `FeatureDefinition`, `PlanVersion`, `PlanVersionFeature` e `BillingPrice`;
- estados draft/published/retired e active/archived;
- 11 feature definitions de chaves estáveis e sem nome de plano;
- backfill de cada plano legado para versão 1 publicada, composição por módulo,
  preços históricos e referência da subscription à versão;
- três triggers PostgreSQL protegem versão, composição e preço publicados;
- domínio valida chave, versão, feature, quota, moeda, centavos, intervalo,
  duplicidades e diferença entre plano pago/gratuito;
- criação de plano/versão/features/preços é transacional;
- publicação é separada, transacional, auditada e permissionada;
- `/admin/catalog` oferece draft completo, revisão, publicação e catálogo visível;
- `/api/admin/catalog` repete a autorização server-side e usa `no-store`.

## Compatibilidade

Campos `Plan`/`PlanModule` históricos não foram apagados nem renomeados. O novo
catálogo é autoritativo para operações novas; a compatibilidade de consumo será
resolvida explicitamente na Etapa 04 e o billing legado na Etapa 06.

## Critérios de interface aplicados

A tela mostra sempre que plano não é permission, diferencia draft de publicado,
expõe a consequência irreversível antes da publicação, apresenta erro sem fingir
sucesso e reorganiza formulário, cards e versões no mobile. Valores financeiros
são rotulados em BRL e convertidos para centavos no servidor.

## Gate

`GATE: APROVADO` em 25/08/2026. Evidências em
`../evidencias/etapa-03/GATE.md`.
