# Guia de Deploy (Publicação)

Este projeto é uma aplicação Next.js e pode ser implantada facilmente em plataformas como **Vercel** ou **Netlify**.

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
    *   Para o comando `npm run dev` voltar a funcionar, você precisa das credenciais do banco.
    *   Instale o Vercel CLI: `npm i -g vercel`
    *   Rode `vercel link` para conectar seu código local ao projeto na nuvem.
    *   Rode `vercel env pull .env` para baixar as senhas do banco para seu computador.
    *   Agora pode rodar `npm run dev` novamente.

4.  **Primeira Execução (Importante):**
    Quando você cria um banco novo, ele vem vazio (sem tabelas e sem usuários). Você precisa "empurrar" o código para lá e criar um usuário inicial.
    
    *   **Criar as Tabelas:**
        No seu terminal (com o `.env` já baixado), rode:
        `npx prisma db push`
    
    *   **Criar Usuário de Teste:**
        Rode o script que cria o usuário `teste@teste.com` (senha: `teste`):
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
