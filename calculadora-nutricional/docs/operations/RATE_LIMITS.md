# Limites de requisição

Atualizado em 2026-07-30.

## Implementação atual

O sistema usa a tabela PostgreSQL `RateLimitBucket`; não há Redis, Upstash ou outro serviço de cache obrigatório nesta etapa.

- Cada tentativa passa por `consumePersistentRateLimit()`.
- O contador é consumido em um único `INSERT ... ON CONFLICT ... RETURNING`, portanto requisições concorrentes não atravessam o mesmo limite.
- Um bucket bloqueado fica limitado a `maxAttempts + 1`, evitando crescimento do contador durante um burst.
- Buckets expirados são removidos em lotes de até 500, no máximo uma vez a cada cinco minutos por processo.
- Rotas HTTP bloqueadas retornam `429`, `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining` e `X-RateLimit-Reset`.

Arquivo central: `src/lib/security/persistent-rate-limit.ts`.

## Políticas padrão

| Escopo | Chave | Limite padrão |
| --- | --- | --- |
| Login | e-mail e IP | 8 por e-mail e 30 por IP a cada 15 min |
| Cadastro | e-mail e aplicação | 5 por e-mail/h e 100 na aplicação/h |
| Recuperação de senha | e-mail, IP e aplicação | 5 por e-mail/h, 60 por IP/h e 60 na aplicação/h |
| Reset de senha | token e IP | 8 por token e 30 por IP a cada 15 min |
| Busca Open Food Facts | usuário e aplicação | 30 por usuário/min; 8 buscas/min e 12 produtos/min globais |
| Exportações (Excel, ZIP e memorial) | usuário | 5/min |
| Gravação de tabelas | usuário | 30/min |
| Ingredientes (criar, editar, excluir e importar) | usuário | 30/min |
| Busca de ingredientes | usuário | 120/min |
| Aprovar ou rejeitar ficha técnica | usuário | 30/min |
| Alterações de workspace, módulos, API token, Enterprise e configurações administrativas | usuário | 20/min |
| API `GET /api/v1/tables` | token | 60/min |
| Importação Gemini | usuário e aplicação | 10 lotes/h, 50 documentos/h por usuário e 5 chamadas/min na aplicação |
| Readiness (`/api/ready`) | IP | 60/min |

Os limites da aplicação para Open Food Facts ficam propositalmente abaixo das cotas públicas da fonte. Como a chamada é feita no servidor, a cota externa enxerga o IP da aplicação, e não o IP de cada navegador.

## Dependências externas

Open Food Facts recebe no máximo 8 consultas de busca/minuto e 12 por código de barras/minuto no conjunto da aplicação. Se o provedor responder `429`, o endpoint devolve `429` ao cliente com o `Retry-After` recebido, sem converter o evento em `502`.

O Gemini recebe um orçamento compartilhado de cinco chamadas por minuto. Falhas transitórias `429`, `503`, indisponibilidade e timeout em `generateContent` usam no máximo duas novas tentativas com exponential backoff e jitter. Erros definitivos não são repetidos.

## Configuração

Os valores de quantidade podem ser alterados por variáveis `REQUEST_LIMIT_*_PER_WINDOW` listadas em `.env.example`. A janela é definida pelo código para cada política; mudar uma quantidade não amplia a janela por acidente.

Exemplo para reduzir exportações a três por minuto:

```text
REQUEST_LIMIT_EXPORTS_PER_WINDOW=3
```

O IP é obtido de `x-forwarded-for` ou `x-real-ip`. O proxy de produção deve substituir esses headers recebidos da internet pelos valores confiáveis do próprio proxy/CDN.

## Payloads e hospedagem

Em Vercel, `VERCEL=1` reduz automaticamente Server Actions, uploads e respostas de exportação para 4 MB, deixando margem para o teto de 4,5 MB da plataforma. Em self-hosted, os limites existentes continuam configuráveis com:

```text
MAX_RUNTIME_REQUEST_BODY_MB=
NEXT_SERVER_ACTION_BODY_SIZE_LIMIT=
TECHNICAL_SHEET_MAX_FILE_SIZE_MB=20
TECHNICAL_SHEET_MAX_BATCH_FILES=5
TECHNICAL_SHEET_MAX_BATCH_SIZE_MB=80
```

Para aceitar arquivos acima do teto da hospedagem gerenciada, o fluxo correto é upload direto para armazenamento de objetos seguido de processamento assíncrono; aumentar apenas `bodySizeLimit` não ultrapassa o limite do provedor.

## Validação local

Com o banco local em `127.0.0.1:54329`:

```bash
npm run db:local:up
npm run db:local:migrate
npm run verify:rate-limit
```

O verificador dispara 24 consumos concorrentes contra o mesmo bucket e confirma que somente cinco são aceitos.

## Evolução futura

Redis/Valkey permanece em aberto. Ele passa a fazer sentido quando a frequência de todos os endpoints tornar a escrita por requisição no PostgreSQL cara, ou quando forem necessários locks distribuídos, filas de trabalho e orçamento de alta taxa. A interface atual concentra o consumo de limite, permitindo trocar o backend sem espalhar regras pelas rotas.
