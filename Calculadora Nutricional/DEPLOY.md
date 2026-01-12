# Guia de Deploy (Publicação)

Este projeto é uma aplicação Next.js e pode ser implantada facilmente em plataformas como **Vercel** ou **Netlify**.

## Opção 1: Vercel (Recomendado)

A maneira mais fácil de implantar sua aplicação Next.js é usando o [Vercel](https://vercel.com/new).

1.  Crie uma conta na Vercel se ainda não tiver.
2.  Instale o Vercel CLI ou conecte sua conta do GitHub.
    *   **Via GitHub:**
        1.  Faça o push do seu código para um repositório no GitHub.
        2.  Vá para o dashboard da Vercel e clique em "Add New Project".
        3.  Importe o repositório do GitHub.
        4.  A Vercel detectará automaticamente que é um projeto Next.js.
        5.  Clique em "Deploy".
    *   **Via CLI (Linha de Comando):**
        1.  No terminal, instale o Vercel CLI globalmente: `npm i -g vercel`
        2.  Execute o comando `vercel` na pasta do projeto.
        3.  Siga as instruções na tela para configurar e implantar.

## Opção 2: Netlify

1.  Crie uma conta no Netlify.
2.  Conecte ao seu Git provider ou arraste a pasta `out` (se estiver usando exportação estática) ou use o Netlify CLI.
3.  **Configurações de Build:**
    *   Build command: `npm run build`
    *   Publish directory: `.next`

## Variáveis de Ambiente

Se o projeto utilizar variáveis de ambiente (arquivo `.env`), lembre-se de configurá-las no painel de configurações do seu projeto na Vercel ou Netlify (seção _Environment Variables_).
