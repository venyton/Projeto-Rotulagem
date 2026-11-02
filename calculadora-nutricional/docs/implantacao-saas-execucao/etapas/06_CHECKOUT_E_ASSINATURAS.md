# Etapa 06 — Checkout e assinaturas

## Estado

DONE

## Objetivo

Implementar o ciclo inicial de contratação recorrente com Checkout hospedado do
Asaas, sem coleta de cartão pela SoIZI e sem tratar redirect como confirmação
financeira.

## Estado inicial encontrado

- catálogo versionado e preços publicados já existem;
- customer mapping Asaas tem claim, reconciliação e external reference;
- `Subscription` ainda representa o contrato legado e não registra tentativas de
  Checkout nem cobranças provider-neutral;
- não existem callbacks de checkout nem fluxo customer-facing de contratação;
- a chave Sandbox está ausente e a homologação externa foi diferida para a Etapa
  12 por decisão humana explícita.

## Documentação oficial obrigatória

Consulta vigente em 26/08/2026, API Asaas v3:

- Create new checkout;
- Asaas Checkout;
- Checkout with Subscription (Recurring);
- How to provide customer data;
- Checkout link and customer redirection;
- Cancel a checkout;
- Events for Checkout;
- documentação oficial do Next.js 16.2.12 para Forms/Server Actions e redirects;
- documentação oficial do Prisma 5.22 para transactions e constraints.

URLs, datas, divergências e decisões ficam em `../FONTES_OFICIAIS.md`.

## Divergência oficial em investigação

O guia oficial `How to provide customer data` documenta o campo `customer` para
reutilizar um customer existente e proíbe enviá-lo junto de `customerData`. O
OpenAPI atual de `Create new checkout` enumera apenas `customerData`. Como a chave
Sandbox ainda não existe, o contrato real não pode ser resolvido hoje. A
implementação deve isolar esse detalhe no adapter, cobrir ambos os shapes por
teste local e manter a ativação externa condicionada ao teste Sandbox final.

## Checklist

- [x] adicionar modelos aditivos para checkout, assinatura e cobrança internas;
- [x] criar contrato provider-neutral do Checkout recorrente;
- [x] mapear ciclo e valores em centavos sem confiar no cliente;
- [x] garantir customer mapping antes da criação do Checkout;
- [x] persistir external reference, provider ID, link, status e correlação;
- [x] impedir criação duplicada por duplo clique/concorrência;
- [x] criar callbacks `success`, `cancel` e `expired` sem autoridade financeira;
- [x] criar fluxo customer-facing com autorização server-side;
- [x] testar sucesso, falha, cancelamento, expiração e resposta ambígua;
- [x] executar migrations, checks, segurança, build e evidências do gate.

## Segurança desde o início

- tenant e permission vêm exclusivamente da sessão server-side;
- preço, plan version, currency e valor são relidos do catálogo publicado;
- nenhuma entrada aceita PAN, CVV ou token de cartão;
- URL de callback é construída de origem confiável e contém somente estado opaco;
- URL retornada pelo provider é validada contra hosts oficiais antes de ser
  exposta ao navegador;
- POST financeiro não recebe retry cego;
- falhas externas e auditoria não registram documento, chave ou payload bruto.

## Resultado

- Checkout hospedado recorrente somente por cartão, com preço e ciclo relidos do
  catálogo publicado;
- claim serializado por organização, reuso de tentativa ativa e bloqueio após
  resultado remoto ambíguo;
- assinatura nasce `INCOMPLETE` e callback nunca cria cobrança nem concede acesso;
- cancelamento e retorno são escopados pelo tenant da sessão;
- migration aditiva aplicada somente no PostgreSQL local;
- homologação do payload `customer` permanece diferida para a Etapa 12.

`GATE: APROVADO` no escopo local. Nenhuma chamada Asaas ou Neon foi executada.
