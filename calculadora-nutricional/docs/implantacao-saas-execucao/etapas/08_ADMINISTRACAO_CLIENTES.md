# Etapa 08 — Administração de clientes

## Estado

DONE

## Objetivo

Entregar visão administrativa server-authoritative de organizações, assinatura,
cobranças, membros, seats, estado e saúde financeira, com permission granular e
sem expor PII completa ou IDs externos desnecessários.

## Checklist inicial

- [x] lista paginada e filtrada de organizações;
- [x] detalhe escopado com overview, assinatura, charges, membros e seats;
- [x] estados vazio, erro, loading e reconciliação visíveis;
- [x] autorização server-side em página, query e ação;
- [x] reprocessamento/reconciliação somente para role autorizada;
- [x] suspensão/reativação limitada, justificada e auditada;
- [x] testes cross-tenant e permission matrix;
- [x] gate visual, acessibilidade e checks completos.

## Resultado

- `/admin/organizations` usa filtros normalizados e paginação limitada a 25;
- nome, owner e somente quatro dígitos finais de CPF/CNPJ compõem o DTO;
- `/admin/organizations/[id]` separa billing, entitlements, membros, segurança,
  auditoria e suporte conforme permissions efetivas da sessão;
- nenhuma query administrativa seleciona tabelas, ingredientes, documentos,
  projetos Enterprise ou outro conteúdo produzido pelo cliente;
- status alterna apenas `ACTIVE ↔ SUSPENDED`, exige confirmação e justificativa
  de 12–500 caracteres e persiste before/after sanitizado na auditoria;
- reconciliação e replay exigem permissions próprias e vínculo do recurso com o
  tenant informado; sem chave Sandbox, a ação externa fica desabilitada;
- `/admin/billing` oferece visão global limitada das filas e estados conciliados
  para papéis que não possuem leitura geral de organizações.

`GATE: APROVADO` no escopo local. A integração Asaas continua deliberadamente
adiada para a Etapa 12 e nenhum acesso ao Neon foi realizado.
