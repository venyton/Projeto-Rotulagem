# Rollout seguro: organizações, CPF/CNPJ e dados compartilhados

Esta mudança transforma tabelas, ingredientes próprios, fichas técnicas e projetos Enterprise em recursos da organização ativa. O `userId` histórico é preservado como autoria; o novo `organizationId` passa a separar a leitura e a escrita dos dados.

## Ordem obrigatória em produção

1. Escolha uma janela de manutenção curta. A migration adiciona índices e torna cinco colunas obrigatórias após o backfill.
2. Gere e valide um backup recuperável do PostgreSQL de produção. Não prossiga apenas com um snapshot não testado.
3. Rode a migration versionada antes de publicar o código da aplicação:

```bash
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

4. Rode as consultas de verificação abaixo.
5. Publique a aplicação e valide login, listagem de tabelas, ingredientes, fichas técnicas e Enterprise em uma organização existente.
6. Mantenha o backup até a validação funcional e operacional ser concluída.

Não use `prisma db push` para este rollout e não execute comandos apontados para produção a partir de uma máquina sem confirmar a URL do banco.

## Garantias da migration

- Nenhuma coluna ou registro histórico é removido.
- Todo recurso preserva o `userId` de quem o criou.
- Antes de preencher `organizationId`, a migration garante que cada organização tenha o membro proprietário.
- Se um usuário histórico tiver dados, mas não possuir organização própria, a migration cria um workspace privado de legado para ele. Dados privados não são enviados para uma empresa da qual ele apenas seja membro.
- A migration aborta antes de aplicar `NOT NULL` se restar qualquer recurso sem organização.
- Organizações existentes começam como `UNCLASSIFIED`; não há inferência de CPF/CNPJ ou alteração silenciosa de dados cadastrais.

## Verificação pós-migration

Rode no banco de produção, em conexão somente de leitura para as consultas abaixo:

```sql
SELECT
  (SELECT count(*) FROM "GeneratedTable" WHERE "organizationId" IS NULL) AS tables_without_organization,
  (SELECT count(*) FROM "CustomIngredient" WHERE "organizationId" IS NULL) AS ingredients_without_organization,
  (SELECT count(*) FROM "TechnicalDocument" WHERE "organizationId" IS NULL) AS documents_without_organization,
  (SELECT count(*) FROM "TechnicalSheetExtraction" WHERE "organizationId" IS NULL) AS extractions_without_organization,
  (SELECT count(*) FROM "EnterpriseLabelProject" WHERE "organizationId" IS NULL) AS enterprise_projects_without_organization;
```

O resultado de todas as colunas deve ser `0`.

```sql
SELECT count(*) AS owners_without_membership
FROM "Organization" organization
WHERE NOT EXISTS (
  SELECT 1
  FROM "OrganizationMember" member
  WHERE member."organizationId" = organization."id"
    AND member."userId" = organization."ownerId"
);
```

O resultado deve ser `0`.

## Reversão

Não execute remoções de colunas como reversão. Caso seja necessário retornar a versão anterior da aplicação, ela continua compatível com as colunas novas. Para reverter dados ou schema, use somente o backup validado e um procedimento aprovado para o ambiente de produção.
