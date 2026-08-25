# Testes, diagnóstico e operações

Leia esta referência quando a tarefa envolver testes, lint, build, Docker, CI/CD,
deploy, migrations, upgrade, modernização ou diagnóstico de bugs.

## Estratégia de testes

Use o teste mais barato que prove o comportamento: unitário para regra pura,
integração para banco/serviço/handler, Testing Library para componente interativo
e Playwright para jornada crítica. Cubra regras de negócio, autorização, tenant,
validação, cálculos, contratos e regressões quando viável.

Teste comportamento observável, evite mocks excessivos e mantenha testes
determinísticos. Use factories, congele tempo quando necessário, isole banco e
E2E e consulte elementos por role/label/nome acessível.

## Qualidade estática

Preserve ESLint, Prettier ou Biome existentes; não introduza formatador nem faça
reformatação global. Desative regra somente no menor escopo e por motivo real.
Não esconda problema com `any`, cast, `catch {}`, `|| true`, `--force` ou regra
globalmente desativada. Diferencie falhas preexistentes das introduzidas.

## Docker, CI e deploy

Não altere infraestrutura fora do escopo. Quando solicitado, use imagem de
produção multi-stage, lockfile congelado, usuário não-root, `.dockerignore`, sem
segredos e apenas artefatos necessários. Confirme runtime e dependências antes de
usar output standalone.

O pipeline deve aplicar gates proporcionais: instalação congelada, lint,
typecheck, testes, build, E2E crítico e segurança. Antes do deploy, valide env,
migrations, compatibilidade código/schema, rollback, health/readiness,
observabilidade e comportamento em múltiplas instâncias.

## Migrations e upgrades

Não atualize Next.js por oportunismo. Quando upgrade for o objetivo, leia o guia
oficial entre as versões real e alvo, confirme Node suportado, avance em etapas,
use codemods oficiais e revise o diff. Valide lint, tipos, testes, build, cache,
cookies, headers, routing e dependências.

Migração Pages Router -> App Router deve ser incremental, preservar URLs/SEO,
migrar data fetching conscientemente e reduzir `'use client'`. Não duplique API
Route e Route Handler para o mesmo endpoint. Migrations de dados incompatíveis
exigem rollout e rollback planejados.

## Diagnóstico

1. reproduza e registre evidência mínima;
2. encontre o primeiro ponto em que o estado diverge;
3. trace entrada, transformação, persistência e saída;
4. teste uma hipótese específica;
5. aplique a menor correção e adicione regressão quando viável;
6. execute verificações relacionadas.

Inspecione console, rede, logs, serialização, cache, sessão, validação, query,
env e runtime. Em falha exclusiva de produção, considere build/runtime env, case
sensitivity, filesystem, CDN/proxy, cookies, múltiplas instâncias, dependências
nativas, migrations, timeout e tamanho de payload.

## Git

Preserve o working tree, revise o diff, mantenha o escopo focado e não inclua
artefatos, segredos ou lockfile sem motivo. Commit, push, reset destrutivo e
mudanças remotas exigem autorização correspondente.
