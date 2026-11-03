# Etapa 07 — Webhooks e reconciliação

## Estado

DONE

## Objetivo

Receber eventos Asaas de forma autenticada e idempotente, persistir antes de
responder, aplicar efeitos financeiros determinísticos e permitir replay e
reconciliação sem confiar em redirects ou em campos enviados pelo cliente.

## Checklist inicial

- [x] revalidar token, eventos, retries, filas e idempotência nas fontes oficiais;
- [x] evoluir a inbox histórica sem armazenar segredo ou erro bruto;
- [x] validar limite, JSON, event ID e token em comparação timing-safe;
- [x] responder rápido após persistência e processar com claim/lease;
- [x] mapear checkout, assinatura e cobranças sem ativação prematura;
- [x] ignorar propriedades e eventos desconhecidos com segurança;
- [x] provar duplicidade serial e concorrente, falha parcial e replay;
- [x] implementar reconciliação provider-neutral por checkout;
- [x] executar gate local completo e registrar evidências.

## Resultado

- endpoint dedicado exige `asaas-access-token`, JSON e no máximo 256 KiB;
- inbox usa `providerEventId` único e persiste somente projeção allowlist;
- HTTP 200 é devolvido depois do commit; `after()` inicia o processador;
- claim/lease evita efeito concorrente duplicado e replay usa a mesma máquina;
- `CHECKOUT_PAID` não ativa assinatura; somente pagamento confirmado/recebido;
- estados financeiros antigos não regressam estados mais avançados;
- reconciliação usa `GET /payments?checkoutSession=...` sob demanda, sem polling;
- o forward-fix do índice longo preservou a migration aplicada e eliminou drift.

`GATE: APROVADO` no escopo local. Token/chave Sandbox e eventos reais continuam
obrigatórios no gate final da Etapa 12.
