CREATE TYPE "PrivilegedSessionStatus" AS ENUM (
  'PENDING_APPROVAL',
  'ACTIVE',
  'REVOKED',
  'EXPIRED'
);

ALTER TABLE "User"
  ADD COLUMN "twoFactorLastUsedStep" INTEGER;

ALTER TABLE "SecurityAuditLog"
  ADD COLUMN "privilegedSessionId" TEXT;

CREATE TABLE "PrivilegedSession" (
  "id" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "approvedByUserId" TEXT,
  "platformPermissionId" TEXT NOT NULL,
  "status" "PrivilegedSessionStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
  "purpose" TEXT NOT NULL,
  "justification" TEXT NOT NULL,
  "ticketReference" TEXT,
  "targetType" TEXT,
  "targetId" TEXT,
  "requestedDurationMinutes" INTEGER NOT NULL,
  "sessionBindingHash" CHAR(64) NOT NULL,
  "correlationId" TEXT NOT NULL,
  "ipHash" CHAR(64),
  "userAgent" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "mfaVerifiedAt" TIMESTAMP(3) NOT NULL,
  "approvedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PrivilegedSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PrivilegedSession_duration_check"
    CHECK ("requestedDurationMinutes" BETWEEN 5 AND 15),
  CONSTRAINT "PrivilegedSession_target_pair_check"
    CHECK (("targetType" IS NULL) = ("targetId" IS NULL)),
  CONSTRAINT "PrivilegedSession_expiry_check"
    CHECK ("expiresAt" > "requestedAt"),
  CONSTRAINT "PrivilegedSession_active_state_check"
    CHECK ("status" <> 'ACTIVE' OR "startedAt" IS NOT NULL),
  CONSTRAINT "PrivilegedSession_approval_pair_check"
    CHECK (("approvedByUserId" IS NULL) = ("approvedAt" IS NULL)),
  CONSTRAINT "PrivilegedSession_distinct_approver_check"
    CHECK ("approvedByUserId" IS NULL OR "approvedByUserId" <> "requestedByUserId")
);

CREATE INDEX "PrivilegedSession_requester_status_expiry_idx"
  ON "PrivilegedSession"("requestedByUserId", "status", "expiresAt");

CREATE INDEX "PrivilegedSession_permission_status_expiry_idx"
  ON "PrivilegedSession"("platformPermissionId", "status", "expiresAt");

CREATE INDEX "PrivilegedSession_approvedByUserId_idx"
  ON "PrivilegedSession"("approvedByUserId");

CREATE INDEX "PrivilegedSession_correlationId_idx"
  ON "PrivilegedSession"("correlationId");

CREATE INDEX "SecurityAuditLog_privilegedSessionId_idx"
  ON "SecurityAuditLog"("privilegedSessionId");

ALTER TABLE "PrivilegedSession"
  ADD CONSTRAINT "PrivilegedSession_requestedByUserId_fkey"
  FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PrivilegedSession"
  ADD CONSTRAINT "PrivilegedSession_approvedByUserId_fkey"
  FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PrivilegedSession"
  ADD CONSTRAINT "PrivilegedSession_platformPermissionId_fkey"
  FOREIGN KEY ("platformPermissionId") REFERENCES "PlatformPermission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SecurityAuditLog"
  ADD CONSTRAINT "SecurityAuditLog_privilegedSessionId_fkey"
  FOREIGN KEY ("privilegedSessionId") REFERENCES "PrivilegedSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "PlatformPermission"
SET "riskLevel" = 'HIGH', "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'platform.organizations.update';

INSERT INTO "PlatformRolePermission" (
  "platformRoleId",
  "platformPermissionId",
  "createdAt"
)
SELECT role."id", permission."id", CURRENT_TIMESTAMP
FROM "PlatformRole" role
JOIN "PlatformPermission" permission
  ON permission."key" = 'platform.support.access_request'
WHERE role."key" = 'SUPPORT_AGENT'
ON CONFLICT ("platformRoleId", "platformPermissionId") DO NOTHING;
