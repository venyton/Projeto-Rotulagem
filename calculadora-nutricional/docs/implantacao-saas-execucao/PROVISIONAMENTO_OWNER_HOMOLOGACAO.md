# Conta de teste em homologação

Este procedimento é manual e separado das migrations comuns. Nunca configure uma
conta privilegiada de teste por migration que possa rodar em produção. A conta
local de testes não é evidência de que o ambiente remoto está pronto.

Antes de executar, confirme independentemente no Neon que o host e o banco são
exclusivos de homologação, obtenha autorização para escrita, faça um backup e
valide as migrations. A conferência dos nomes pelo script detecta divergências,
mas **não comprova** que um banco seja de homologação.

Execute `node scripts/prepare-staging-owner.mjs` somente na aplicação, com as
seguintes variáveis fornecidas pelo ambiente seguro da operação, sem registrá-las
no repositório ou em comandos gravados no histórico:

- `SOIZI_STAGING_DATABASE_URL`: URL direta do Neon, com `sslmode=require`;
- `SOIZI_STAGING_EXPECTED_HOST`: host conferido independentemente;
- `SOIZI_STAGING_EXPECTED_DATABASE`: nome do banco conferido independentemente;
- `SOIZI_STAGING_PASSWORD`: senha exclusiva e forte da conta de teste;
- `SOIZI_STAGING_CONFIRM`: `CONFIRMO_HOMOLOGACAO`.

O script cria a conta `admin@soizi.com.br` e um workspace próprio com acesso aos
módulos, sem substituir conta existente e sem exigir plano ou assinatura. Não
cria um operador global: após ativar 2FA na conta, use o fluxo administrativo
aprovado de concessão `PLATFORM_OWNER`, com sessão privilegiada e as aprovações
exigidas. Isso preserva os controles de MFA e maker-checker existentes.

Ao final dos testes, revogue o acesso de plataforma conforme o processo de
segurança e trate a conta e a senha como credenciais de homologação. Não use a
senha exposta na conversa em nenhum ambiente remoto.
