# Guia de Deploy (Publicação)

Este projeto é uma aplicação Next.js e pode ser implantada facilmente em plataformas como **Vercel** ou **Netlify**.

## Regras de segurança do deploy

- O banco de produção deve receber somente `npx prisma migrate deploy`; não use `db push`.
- Faça backup antes da migration e confirme o registro em `_prisma_migrations` depois dela.
- Separe `.env.local`, staging e produção. Não baixe segredos de produção para o checkout local.
- Rode `npm run check`, `npm run security:check` e `npm run build` antes do deploy.
- Rode também `npm run verify:rate-limit` contra o banco local; nunca execute esse verificador em produção.
- Depois de publicar, verifique `/api/health`, `/api/ready`, login, criação de tabela e os quatro documentos técnicos em `/api/export/memorial` (Memorial/Ficha, PDF/XLSX).

## Opção 1: Vercel (Recomendado)

A maneira mais fácil de implantar sua aplicação Next.js é usando o [Vercel](https://vercel.com/new).

1.  **Prepare o Banco de Dados (Vercel Postgres):**
    *   Vá para o painel da Vercel e acesse a aba "Storage".
    *   Clique em "Create Database" e selecione "Postgres".
    *   Dê um nome (ex: `calculadora-db`) e escolha a região (Washington, D.C. é o padrão e funciona bem).
    *   Conecte o banco ao seu projeto Vercel (se já tiver criado o projeto) ou faça isso depois de criar o projeto.

2.  **Deploy na Vercel:**
    *   Instale o Vercel CLI ou conecte sua conta do GitHub (Recomendado).
    *   **Via GitHub:**
        1.  Faça o push deste código atualizado para o GitHub.
        2.  Importe o projeto na Vercel.
        3.  Na tela de configuração de Deploy, abra "Environment Variables".
        4.  Se você já criou o banco e conectou, as variáveis (`POSTGRES_PRISMA_URL`, etc.) já estarão lá automaticamente!
        5.  Clique em "Deploy".

3.  **Configuração Local (Para rodar no seu PC):**
    *   Copie `.env.example` para `.env.local` e preencha somente credenciais de desenvolvimento.
    *   Use PostgreSQL local ou um banco de staging isolado.
    *   Não use `vercel env pull .env` para trazer segredos de produção para o checkout.

4.  **Primeira Execução (Importante):**
    Quando você cria um banco novo, ele vem vazio (sem tabelas e sem usuários). Aplique as migrations e crie um usuário inicial em local/staging.
    
    *   **Criar as Tabelas:**
        No seu terminal (com o ambiente explicitamente configurado), rode:
        `npx prisma migrate deploy --schema=./prisma/schema.prisma`
    
    *   **Gerar Prisma Client:**
        `npx prisma generate --schema=./prisma/schema.prisma`
    
    *   **Criar Usuário de Teste:**
        Rode o script que cria o usuário `teste@teste.com` somente em local/staging. A senha padrão local é `TesteSeguro2026`; para outra senha, defina `SEED_TEST_PASSWORD`.
        `node scripts/seed-test-user.js`
    
    *   **Carregar Ingredientes (TACO):**
        Se quiser popular o banco com a tabela TACO:
        `npx tsx scripts/seed.ts`

## Opção 2: Netlify

1.  Crie uma conta no Netlify.
2.  Conecte ao seu Git provider ou arraste a pasta `out` (se estiver usando exportação estática) ou use o Netlify CLI.
3.  **Configurações de Build:**
    *   Build command: `npm run build`
    *   Publish directory: `.next`

## Variáveis de Ambiente

Se o projeto utilizar variáveis de ambiente (arquivo `.env`), lembre-se de configurá-las no painel de configurações do seu projeto na Vercel ou Netlify (seção _Environment Variables_).

Obrigatórias:

```text
POSTGRES_PRISMA_URL
POSTGRES_URL_NON_POOLING
NEXTAUTH_SECRET
NEXTAUTH_URL
NEXT_PUBLIC_APP_URL
```

Recomendadas/opcionais por funcionalidade:

```text
OPEN_FOOD_FACTS_USER_AGENT
GEMINI_API_KEY
GEMINI_MODEL
TECHNICAL_SHEET_MAX_FILE_SIZE_MB
TECHNICAL_SHEET_MAX_BATCH_FILES
TECHNICAL_SHEET_MAX_BATCH_SIZE_MB
MAX_RUNTIME_REQUEST_BODY_MB
NEXT_SERVER_ACTION_BODY_SIZE_LIMIT
REQUEST_LIMIT_OPEN_FOOD_FACTS_SEARCH_PER_WINDOW
REQUEST_LIMIT_OPEN_FOOD_FACTS_PRODUCT_PER_WINDOW
REQUEST_LIMIT_OPEN_FOOD_FACTS_USER_PER_WINDOW
REQUEST_LIMIT_EXPORTS_PER_WINDOW
REQUEST_LIMIT_API_TABLES_PER_WINDOW
REQUEST_LIMIT_GEMINI_PROJECT_PER_WINDOW
REQUEST_LIMIT_GEMINI_USER_PER_WINDOW
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
META_CLIENT_ID
META_CLIENT_SECRET
MICROSOFT_ENTRA_ID_CLIENT_ID
MICROSOFT_ENTRA_ID_CLIENT_SECRET
MICROSOFT_ENTRA_TENANT_ID
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_PROFESSIONAL_MONTH
STRIPE_PRICE_PROFESSIONAL_YEAR
STRIPE_PRICE_ENTERPRISE_MONTH
STRIPE_PRICE_ENTERPRISE_YEAR
ANALYTICS_HASH_SALT
RATE_LIMIT_HASH_SALT
NEXT_PUBLIC_MARKETING_TRACKING_ENABLED
NEXT_PUBLIC_GA_MEASUREMENT_ID
NEXT_PUBLIC_META_PIXEL_ID
```

Consulte `docs/operations/RATE_LIMITS.md` para todas as políticas. Em Vercel, o teto de payload de Function é 4,5 MB; a aplicação aplica 4 MB automaticamente. Para processar arquivos maiores, use armazenamento de objetos com upload direto, não apenas um `bodySizeLimit` maior.

SQL manual organizado para DBA:

```text
docs/database/sql/README.md
```
