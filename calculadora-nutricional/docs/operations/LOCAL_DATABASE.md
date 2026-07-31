# Banco local isolado

O desenvolvimento e a verificação HTTP usam PostgreSQL Docker em
`127.0.0.1:54329`. O script cria `.env.local` ignorado pelo Git e recusa qualquer
URL que não seja loopback nessa porta, protegendo o `.env` existente e ambientes
remotos.

```bash
npm run db:local:up
npm run db:local:migrate
npm run dev
```

Com o servidor iniciado em outra janela, a verificação HTTP completa usa o mesmo
`.env.local` automaticamente e recusa qualquer banco remoto:

```bash
MODULE_TEST_BASE_URL=http://127.0.0.1:3100 npm run verify:modules:runtime
```

`npm run dev` executa `predev`, então o banco é preparado automaticamente. Para
encerrar o container:

```bash
npm run db:local:down
```

O banco local começa vazio. Não há cópia de usuários, dados ou migrations de
produção; o bootstrap registra as migrations existentes somente no banco local
recém-criado.
