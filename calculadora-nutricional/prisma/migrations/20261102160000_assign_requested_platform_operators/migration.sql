-- Concessões solicitadas para os usuários identificados no Neon consultado.
-- IDs imutáveis evitam depender de nomes ou publicar endereços de e-mail.
-- Bancos sem nenhum dos usuários são instalações independentes e não recebem
-- concessões. Em caso de conjunto parcial ou inconsistente, interromper.
DO $$
DECLARE
  requested_ids CONSTANT TEXT[] := ARRAY[
    'cmkh7skau0000h44n32ndrxk8',
    'cmod1gsqb0000qsgnojuop4r9',
    'cmt3mebv500004mtex6ovf48l',
    'cmkb6lnr30000g7oq5hcip47h',
    'cmkh6mwtb00001rylskpl49km'
  ];
  present_count INTEGER;
BEGIN
  SELECT count(*) INTO present_count FROM "User" WHERE id = ANY(requested_ids);
  IF present_count = 0 THEN
    RETURN;
  END IF;
  IF present_count <> cardinality(requested_ids) THEN
    RAISE EXCEPTION 'Atribuições de plataforma canceladas: conjunto incompleto de usuários esperados.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(requested_ids) AS expected(id)
    WHERE NOT EXISTS (
      SELECT 1 FROM "Organization" organization
      JOIN "OrganizationMember" member
        ON member."organizationId" = organization.id AND member."userId" = expected.id
      WHERE organization."ownerId" = expected.id
        AND organization.status::text = 'ACTIVE'
        AND member.role::text = 'OWNER'
        AND member.active = true
    )
  ) THEN
    RAISE EXCEPTION 'Atribuições de plataforma canceladas: proprietário ou organização não está ativo.';
  END IF;

  IF (SELECT count(*) FROM "PlatformRole" WHERE key IN ('PLATFORM_OWNER', 'PLATFORM_ADMIN')) <> 2 THEN
    RAISE EXCEPTION 'Atribuições de plataforma canceladas: papéis internos indisponíveis.';
  END IF;

  -- Raven recebe ADMIN; não silenciar um OWNER pré-existente ou agendado.
  IF EXISTS (
    SELECT 1 FROM "PlatformAdminAssignment" assignment
    JOIN "PlatformRole" role ON role.id = assignment."platformRoleId"
    WHERE assignment."userId" = 'cmt3mebv500004mtex6ovf48l'
      AND role.key = 'PLATFORM_OWNER'
      AND assignment.status::text = 'ACTIVE'
      AND (assignment."expiresAt" IS NULL OR assignment."expiresAt" > CURRENT_TIMESTAMP)
  ) THEN
    RAISE EXCEPTION 'Atribuições de plataforma canceladas: usuário destinado a administrador possui OWNER ativo ou agendado.';
  END IF;

  -- Uma suspensão ou revogação anterior exige revisão, não reativação implícita.
  IF EXISTS (
    WITH requested("userId", "roleKey") AS (VALUES
      ('cmkh7skau0000h44n32ndrxk8', 'PLATFORM_OWNER'),
      ('cmod1gsqb0000qsgnojuop4r9', 'PLATFORM_OWNER'),
      ('cmt3mebv500004mtex6ovf48l', 'PLATFORM_ADMIN'),
      ('cmkb6lnr30000g7oq5hcip47h', 'PLATFORM_OWNER'),
      ('cmkh6mwtb00001rylskpl49km', 'PLATFORM_OWNER')
    )
    SELECT 1 FROM requested
    JOIN "PlatformRole" role ON role.key = requested."roleKey"
    JOIN "PlatformAdminAssignment" assignment ON assignment."userId" = requested."userId" AND assignment."platformRoleId" = role.id
    WHERE assignment.status::text IN ('SUSPENDED', 'REVOKED')
      AND NOT EXISTS (
        SELECT 1 FROM "PlatformAdminAssignment" active_assignment
        WHERE active_assignment."userId" = requested."userId" AND active_assignment."platformRoleId" = role.id
          AND active_assignment.status::text = 'ACTIVE'
          AND active_assignment."startsAt" <= CURRENT_TIMESTAMP
          AND active_assignment."expiresAt" IS NULL
      )
  ) THEN
    RAISE EXCEPTION 'Atribuições de plataforma canceladas: há concessão suspensa ou revogada que exige revisão.';
  END IF;

  WITH requested("userId", "roleKey") AS (VALUES
    ('cmkh7skau0000h44n32ndrxk8', 'PLATFORM_OWNER'),
    ('cmod1gsqb0000qsgnojuop4r9', 'PLATFORM_OWNER'),
    ('cmt3mebv500004mtex6ovf48l', 'PLATFORM_ADMIN'),
    ('cmkb6lnr30000g7oq5hcip47h', 'PLATFORM_OWNER'),
    ('cmkh6mwtb00001rylskpl49km', 'PLATFORM_OWNER')
  ), inserted AS (
    INSERT INTO "PlatformAdminAssignment" (id, "userId", "platformRoleId", status, "startsAt", "updatedAt")
    SELECT 'migration_platform_' || md5(requested."userId" || ':' || role.key), requested."userId", role.id, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM requested JOIN "PlatformRole" role ON role.key = requested."roleKey"
    WHERE NOT EXISTS (
      SELECT 1 FROM "PlatformAdminAssignment" assignment
      WHERE assignment."userId" = requested."userId" AND assignment."platformRoleId" = role.id
        AND assignment.status::text = 'ACTIVE' AND assignment."startsAt" <= CURRENT_TIMESTAMP
        AND assignment."expiresAt" IS NULL
    )
    RETURNING id, "userId", "platformRoleId"
  )
  INSERT INTO "SecurityAuditLog" (id, "actorType", action, "riskLevel", permission, "targetType", "targetId", result, reason, metadata)
  SELECT 'migration_platform_audit_' || md5(inserted.id), 'SYSTEM', 'platform.assignment.migration.created', 'CRITICAL',
    'platform.security.operators.manage', 'PLATFORM_ADMIN_ASSIGNMENT', inserted.id, 'SUCCESS',
    'Concessão autorizada por migration versionada.',
    jsonb_build_object('subjectUserId', inserted."userId", 'roleKey', role.key, 'migration', '20261102160000_assign_requested_platform_operators')
  FROM inserted JOIN "PlatformRole" role ON role.id = inserted."platformRoleId";
END $$;
