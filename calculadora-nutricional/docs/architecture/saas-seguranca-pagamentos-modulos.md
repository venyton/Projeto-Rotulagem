# Camada SaaS, seguranca, pagamentos e modulos

Este documento descreve a base criada para operar a calculadora como SaaS com assinatura, modulos por participante, login externo e funil de marketing.

## Aceite minimo

Cada bloco abaixo foi desenhado para ficar acima de 8,2/10 como base tecnica inicial. A nota final de producao ainda depende de chaves reais, webhook publicado, testes de checkout real e configuracao do provedor de OAuth.

## Seguranca

Implementado:

- Login por credenciais com bcrypt.
- 2FA TOTP com segredo criptografado.
- Rate limit persistente em banco por hash de chave.
- Headers de seguranca no `next.config.ts`.
- Protecao de origem em rotas mutaveis.
- Auditoria por `SecurityAuditLog`.
- Senhas opcionais para contas criadas via OAuth.

Arquivos principais:

- `src/lib/auth.ts`
- `src/lib/security/persistent-rate-limit.ts`
- `prisma/schema.prisma`

## Pagamentos

Implementado com Stripe Checkout hospedado. O cartao nao passa pelo nosso backend.

Fluxos:

- `POST /api/billing/checkout`: cria sessao de checkout.
- `POST /api/billing/portal`: abre portal do cliente.
- `POST /api/billing/webhook`: valida assinatura, persiste evento e sincroniza assinatura.

Tabelas:

- `BillingCustomer`
- `Subscription`
- `BillingWebhookEvent`
- `Plan`
- `PlanModule`

Variaveis:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PROFESSIONAL_MONTH`
- `STRIPE_PRICE_PROFESSIONAL_YEAR`
- `STRIPE_PRICE_ENTERPRISE_MONTH`
- `STRIPE_PRICE_ENTERPRISE_YEAR`

## Modularizacao tecnica

O produto agora tem catalogo central de modulos:

- `TABLES`
- `CUSTOM_INGREDIENTS`
- `TECHNICAL_SHEETS`
- `OPEN_FOOD_FACTS`
- `ENTERPRISE_LABELS`
- `EXPORTS`
- `AI_IMPORT`
- `MARKETING_ANALYTICS`
- `API_ACCESS`
- `BILLING`

Arquivos:

- `src/features/saas/domain/modules.ts`
- `src/features/saas/domain/plans.ts`
- `src/features/saas/services/entitlements.ts`

## Modulo por participante

Implementado em duas camadas:

- `OrganizationEntitlement`: o que o plano da organizacao permite.
- `ParticipantModuleGrant`: o que cada participante pode usar.

Rotas e tela:

- `GET /api/saas/participants/modules`
- `POST /api/saas/participants/modules`
- `/dashboard/modules`

Regra:

- Dono e admin usam todo modulo liberado para a organizacao.
- Participante comum precisa de grant explicito.

## Login externo

O cadastro/login externo esta preparado em NextAuth para:

- Google
- Meta/Facebook
- Microsoft/Outlook

Variaveis:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `META_CLIENT_ID`
- `META_CLIENT_SECRET`
- `MICROSOFT_ENTRA_ID_CLIENT_ID`
- `MICROSOFT_ENTRA_ID_CLIENT_SECRET`
- `MICROSOFT_ENTRA_TENANT_ID`

## KPIs e marketing

Implementado:

- Captura de inicio de cadastro.
- Captura de cadastro finalizado.
- Captura de checkout iniciado.
- Captura de checkout finalizado.
- Palavras-chave via `utm_term`.
- Origem, meio e campanha via `utm_source`, `utm_medium`, `utm_campaign`.
- Envio opcional de eventos para GA4 e Meta Pixel no navegador.

Rotas e tela:

- `POST /api/marketing/events`
- `/dashboard/marketing`

Variaveis externas:

- `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- `NEXT_PUBLIC_META_PIXEL_ID`

Tabelas:

- `MarketingKeyword`
- `MarketingEvent`

## Modulos futuros bons para o sistema

Sugestoes ja encaixadas no desenho:

- API externa com token por cliente.
- Limite de uso por modulo.
- Relatorios de rotulo por empresa.
- Workflow de aprovacao regulatoria por time.
- Biblioteca compartilhada de ingredientes por organizacao.
- Auditoria exportavel para compliance.
- Cupons e planos promocionais via Stripe.
- Webhooks B2B para ERPs e CRMs.
