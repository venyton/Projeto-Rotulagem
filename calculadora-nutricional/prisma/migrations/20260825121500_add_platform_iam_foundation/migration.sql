-- Etapa 02: IAM interno do Control Plane.
-- Estritamente aditiva: nenhuma tabela, coluna ou enum existente é removido.

CREATE TYPE "PlatformPermissionRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "PlatformAssignmentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');

CREATE TABLE "PlatformRole" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformPermission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "riskLevel" "PlatformPermissionRiskLevel" NOT NULL DEFAULT 'LOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformPermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformRolePermission" (
    "platformRoleId" TEXT NOT NULL,
    "platformPermissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformRolePermission_pkey" PRIMARY KEY ("platformRoleId", "platformPermissionId")
);

CREATE TABLE "PlatformAdminAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platformRoleId" TEXT NOT NULL,
    "status" "PlatformAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "assignedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformAdminAssignment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PlatformAdminAssignment_valid_window" CHECK ("expiresAt" IS NULL OR "expiresAt" > "startsAt")
);

CREATE UNIQUE INDEX "PlatformRole_key_key" ON "PlatformRole"("key");
CREATE UNIQUE INDEX "PlatformPermission_key_key" ON "PlatformPermission"("key");
CREATE INDEX "PlatformPermission_riskLevel_idx" ON "PlatformPermission"("riskLevel");
CREATE INDEX "PlatformRolePermission_platformPermissionId_idx" ON "PlatformRolePermission"("platformPermissionId");
CREATE INDEX "PlatformAdminAssignment_userId_status_startsAt_expiresAt_idx" ON "PlatformAdminAssignment"("userId", "status", "startsAt", "expiresAt");
CREATE INDEX "PlatformAdminAssignment_platformRoleId_status_idx" ON "PlatformAdminAssignment"("platformRoleId", "status");
CREATE INDEX "PlatformAdminAssignment_assignedByUserId_idx" ON "PlatformAdminAssignment"("assignedByUserId");

ALTER TABLE "PlatformRolePermission"
    ADD CONSTRAINT "PlatformRolePermission_platformRoleId_fkey"
    FOREIGN KEY ("platformRoleId") REFERENCES "PlatformRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformRolePermission"
    ADD CONSTRAINT "PlatformRolePermission_platformPermissionId_fkey"
    FOREIGN KEY ("platformPermissionId") REFERENCES "PlatformPermission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformAdminAssignment"
    ADD CONSTRAINT "PlatformAdminAssignment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformAdminAssignment"
    ADD CONSTRAINT "PlatformAdminAssignment_platformRoleId_fkey"
    FOREIGN KEY ("platformRoleId") REFERENCES "PlatformRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformAdminAssignment"
    ADD CONSTRAINT "PlatformAdminAssignment_assignedByUserId_fkey"
    FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SecurityAuditLog"
    ADD COLUMN "actorType" TEXT NOT NULL DEFAULT 'USER',
    ADD COLUMN "actorRole" TEXT,
    ADD COLUMN "permission" TEXT,
    ADD COLUMN "targetType" TEXT,
    ADD COLUMN "targetId" TEXT,
    ADD COLUMN "result" TEXT NOT NULL DEFAULT 'SUCCESS',
    ADD COLUMN "reason" TEXT,
    ADD COLUMN "correlationId" TEXT,
    ADD COLUMN "requestMetadataSafe" JSONB,
    ADD COLUMN "beforeJsonSafe" JSONB,
    ADD COLUMN "afterJsonSafe" JSONB;

CREATE INDEX "SecurityAuditLog_permission_idx" ON "SecurityAuditLog"("permission");
CREATE INDEX "SecurityAuditLog_result_idx" ON "SecurityAuditLog"("result");
CREATE INDEX "SecurityAuditLog_correlationId_idx" ON "SecurityAuditLog"("correlationId");

INSERT INTO "PlatformRole" ("id", "key", "name", "description", "updatedAt") VALUES
    ('platform_role_owner', 'PLATFORM_OWNER', 'Proprietário da plataforma', 'Gestão excepcional e recuperação do Control Plane; uso diário desencorajado.', CURRENT_TIMESTAMP),
    ('platform_role_admin', 'PLATFORM_ADMIN', 'Administrador da plataforma', 'Operações gerais de plataforma sem acesso automático ao conteúdo tenant.', CURRENT_TIMESTAMP),
    ('platform_role_customer_admin', 'CUSTOMER_ADMIN', 'Administrador de clientes', 'Organizações, memberships, onboarding e status operacional.', CURRENT_TIMESTAMP),
    ('platform_role_billing_admin', 'BILLING_ADMIN', 'Administrador de billing', 'Assinaturas, cobranças e reconciliação dentro das permissões explícitas.', CURRENT_TIMESTAMP),
    ('platform_role_product_admin', 'PRODUCT_ADMIN', 'Administrador de produto', 'Catálogo, planos, features, preços e publicação.', CURRENT_TIMESTAMP),
    ('platform_role_support_agent', 'SUPPORT_AGENT', 'Agente de suporte', 'Metadata diagnóstica sem conteúdo tenant por padrão.', CURRENT_TIMESTAMP),
    ('platform_role_security_admin', 'SECURITY_ADMIN', 'Administrador de segurança', 'Operadores, sessões, credenciais e revisões de acesso.', CURRENT_TIMESTAMP),
    ('platform_role_auditor', 'AUDITOR', 'Auditor', 'Leitura de auditoria e estado operacional sem mutações.', CURRENT_TIMESTAMP),
    ('platform_role_ops_admin', 'OPS_ADMIN', 'Administrador de operações', 'Saúde, integrações, jobs e reconciliação operacional.', CURRENT_TIMESTAMP);

INSERT INTO "PlatformPermission" ("id", "key", "name", "description", "riskLevel", "updatedAt") VALUES
    ('platform_permission_access', 'platform.access', 'Acessar Control Plane', 'Entrar no ambiente administrativo interno.', 'LOW', CURRENT_TIMESTAMP),
    ('platform_permission_organizations_read', 'platform.organizations.read', 'Ler organizações', 'Consultar metadata administrativa de organizações.', 'LOW', CURRENT_TIMESTAMP),
    ('platform_permission_organizations_update', 'platform.organizations.update', 'Alterar organizações', 'Alterar metadata e estado operacional permitido.', 'MEDIUM', CURRENT_TIMESTAMP),
    ('platform_permission_users_read', 'platform.users.read', 'Ler usuários', 'Consultar identidade e membership sem conteúdo tenant.', 'LOW', CURRENT_TIMESTAMP),
    ('platform_permission_users_suspend', 'platform.users.suspend', 'Suspender usuários', 'Suspender acesso de usuário conforme política.', 'HIGH', CURRENT_TIMESTAMP),
    ('platform_permission_billing_read', 'platform.billing.read', 'Ler billing', 'Consultar assinaturas e cobranças.', 'LOW', CURRENT_TIMESTAMP),
    ('platform_permission_billing_reconcile', 'platform.billing.reconcile', 'Reconciliar billing', 'Executar reconciliação operacional segura.', 'MEDIUM', CURRENT_TIMESTAMP),
    ('platform_permission_billing_refund', 'platform.billing.refund', 'Realizar refund', 'Solicitar estorno financeiro conforme limites.', 'CRITICAL', CURRENT_TIMESTAMP),
    ('platform_permission_catalog_read', 'platform.catalog.read', 'Ler catálogo', 'Consultar catálogo comercial interno.', 'LOW', CURRENT_TIMESTAMP),
    ('platform_permission_catalog_manage', 'platform.catalog.manage', 'Editar catálogo', 'Editar drafts de catálogo.', 'MEDIUM', CURRENT_TIMESTAMP),
    ('platform_permission_catalog_publish', 'platform.catalog.publish', 'Publicar catálogo', 'Publicar versão comercial imutável.', 'HIGH', CURRENT_TIMESTAMP),
    ('platform_permission_entitlements_read', 'platform.entitlements.read', 'Ler entitlements', 'Consultar acesso efetivo de organizações.', 'LOW', CURRENT_TIMESTAMP),
    ('platform_permission_entitlements_override', 'platform.entitlements.override', 'Sobrescrever entitlements', 'Aplicar override explícito e auditado.', 'HIGH', CURRENT_TIMESTAMP),
    ('platform_permission_security_operators_read', 'platform.security.operators.read', 'Ler operadores', 'Consultar assignments internos.', 'LOW', CURRENT_TIMESTAMP),
    ('platform_permission_security_operators_manage', 'platform.security.operators.manage', 'Gerenciar operadores', 'Criar, alterar ou revogar operadores internos.', 'CRITICAL', CURRENT_TIMESTAMP),
    ('platform_permission_security_reset_2fa', 'platform.security.reset_2fa', 'Redefinir 2FA', 'Iniciar recuperação administrativa de 2FA.', 'HIGH', CURRENT_TIMESTAMP),
    ('platform_permission_support_metadata_read', 'platform.support.metadata.read', 'Ler metadata de suporte', 'Consultar diagnóstico sem conteúdo tenant.', 'LOW', CURRENT_TIMESTAMP),
    ('platform_permission_support_access_request', 'platform.support.access_request', 'Solicitar acesso de suporte', 'Solicitar sessão controlada para suporte sensível.', 'HIGH', CURRENT_TIMESTAMP),
    ('platform_permission_audit_read', 'platform.audit.read', 'Ler auditoria', 'Consultar eventos de auditoria sanitizados.', 'MEDIUM', CURRENT_TIMESTAMP),
    ('platform_permission_operations_read', 'platform.operations.read', 'Ler operação', 'Consultar saúde, jobs e integrações.', 'LOW', CURRENT_TIMESTAMP),
    ('platform_permission_operations_reprocess', 'platform.operations.reprocess', 'Reprocessar operação', 'Reprocessar evento operacional não destrutivo.', 'MEDIUM', CURRENT_TIMESTAMP);

INSERT INTO "PlatformRolePermission" ("platformRoleId", "platformPermissionId")
SELECT role_row."id", permission_row."id"
FROM "PlatformRole" role_row
CROSS JOIN "PlatformPermission" permission_row
WHERE role_row."key" = 'PLATFORM_OWNER';

WITH grants("roleKey", "permissionKey") AS (
    VALUES
        ('PLATFORM_ADMIN', 'platform.access'),
        ('PLATFORM_ADMIN', 'platform.organizations.read'),
        ('PLATFORM_ADMIN', 'platform.organizations.update'),
        ('PLATFORM_ADMIN', 'platform.users.read'),
        ('PLATFORM_ADMIN', 'platform.users.suspend'),
        ('PLATFORM_ADMIN', 'platform.billing.read'),
        ('PLATFORM_ADMIN', 'platform.catalog.read'),
        ('PLATFORM_ADMIN', 'platform.entitlements.read'),
        ('PLATFORM_ADMIN', 'platform.support.metadata.read'),
        ('PLATFORM_ADMIN', 'platform.audit.read'),
        ('PLATFORM_ADMIN', 'platform.operations.read'),
        ('PLATFORM_ADMIN', 'platform.operations.reprocess'),
        ('CUSTOMER_ADMIN', 'platform.access'),
        ('CUSTOMER_ADMIN', 'platform.organizations.read'),
        ('CUSTOMER_ADMIN', 'platform.organizations.update'),
        ('CUSTOMER_ADMIN', 'platform.users.read'),
        ('CUSTOMER_ADMIN', 'platform.users.suspend'),
        ('BILLING_ADMIN', 'platform.access'),
        ('BILLING_ADMIN', 'platform.billing.read'),
        ('BILLING_ADMIN', 'platform.billing.reconcile'),
        ('BILLING_ADMIN', 'platform.billing.refund'),
        ('BILLING_ADMIN', 'platform.entitlements.read'),
        ('PRODUCT_ADMIN', 'platform.access'),
        ('PRODUCT_ADMIN', 'platform.catalog.read'),
        ('PRODUCT_ADMIN', 'platform.catalog.manage'),
        ('PRODUCT_ADMIN', 'platform.catalog.publish'),
        ('PRODUCT_ADMIN', 'platform.entitlements.read'),
        ('SUPPORT_AGENT', 'platform.access'),
        ('SUPPORT_AGENT', 'platform.organizations.read'),
        ('SUPPORT_AGENT', 'platform.users.read'),
        ('SUPPORT_AGENT', 'platform.support.metadata.read'),
        ('SECURITY_ADMIN', 'platform.access'),
        ('SECURITY_ADMIN', 'platform.organizations.read'),
        ('SECURITY_ADMIN', 'platform.users.read'),
        ('SECURITY_ADMIN', 'platform.security.operators.read'),
        ('SECURITY_ADMIN', 'platform.security.operators.manage'),
        ('SECURITY_ADMIN', 'platform.security.reset_2fa'),
        ('SECURITY_ADMIN', 'platform.audit.read'),
        ('AUDITOR', 'platform.access'),
        ('AUDITOR', 'platform.organizations.read'),
        ('AUDITOR', 'platform.billing.read'),
        ('AUDITOR', 'platform.catalog.read'),
        ('AUDITOR', 'platform.entitlements.read'),
        ('AUDITOR', 'platform.audit.read'),
        ('AUDITOR', 'platform.operations.read'),
        ('OPS_ADMIN', 'platform.access'),
        ('OPS_ADMIN', 'platform.billing.read'),
        ('OPS_ADMIN', 'platform.billing.reconcile'),
        ('OPS_ADMIN', 'platform.audit.read'),
        ('OPS_ADMIN', 'platform.operations.read'),
        ('OPS_ADMIN', 'platform.operations.reprocess')
)
INSERT INTO "PlatformRolePermission" ("platformRoleId", "platformPermissionId")
SELECT role_row."id", permission_row."id"
FROM grants
JOIN "PlatformRole" role_row ON role_row."key" = grants."roleKey"
JOIN "PlatformPermission" permission_row ON permission_row."key" = grants."permissionKey";
