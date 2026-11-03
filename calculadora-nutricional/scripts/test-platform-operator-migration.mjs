import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const migration = readFileSync(resolve(root, "prisma/migrations/20261102160000_assign_requested_platform_operators/migration.sql"), "utf8");
const ids = [
  "cmkh7skau0000h44n32ndrxk8", "cmod1gsqb0000qsgnojuop4r9", "cmt3mebv500004mtex6ovf48l",
  "cmkb6lnr30000g7oq5hcip47h", "cmkh6mwtb00001rylskpl49km",
];
const setup = `
BEGIN;
CREATE TEMP TABLE "User" (id text PRIMARY KEY);
CREATE TEMP TABLE "Organization" (id text PRIMARY KEY, "ownerId" text, status text);
CREATE TEMP TABLE "OrganizationMember" ("organizationId" text, "userId" text, role text, active boolean);
CREATE TEMP TABLE "PlatformRole" (id text PRIMARY KEY, key text UNIQUE);
CREATE TEMP TABLE "PlatformAdminAssignment" (id text PRIMARY KEY, "userId" text, "platformRoleId" text, status text, "startsAt" timestamp, "expiresAt" timestamp, "updatedAt" timestamp);
CREATE TEMP TABLE "SecurityAuditLog" (id text PRIMARY KEY, "actorType" text, action text, "riskLevel" text, permission text, "targetType" text, "targetId" text, result text, reason text, metadata jsonb);
INSERT INTO "PlatformRole" VALUES ('test-owner', 'PLATFORM_OWNER'), ('test-admin', 'PLATFORM_ADMIN');
`;
const seeded = `
INSERT INTO "User" (id) VALUES ${ids.map((id) => `('${id}')`).join(", ")};
INSERT INTO "Organization" (id, "ownerId", status) SELECT 'org-' || id, id, 'ACTIVE' FROM "User";
INSERT INTO "OrganizationMember" ("organizationId", "userId", role, active) SELECT id, "ownerId", 'OWNER', true FROM "Organization";
INSERT INTO "User" VALUES ('unrelated-user');
`;
const assertComplete = `
DO $$ BEGIN
  IF (SELECT count(*) FROM "PlatformAdminAssignment") <> 5 THEN RAISE EXCEPTION 'Quantidade incorreta de atribuições'; END IF;
  IF (SELECT count(*) FROM "PlatformAdminAssignment" WHERE "platformRoleId" = 'test-owner') <> 4 THEN RAISE EXCEPTION 'Quantidade incorreta de owners'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "PlatformAdminAssignment" WHERE "userId" = '${ids[2]}' AND "platformRoleId" = 'test-admin') THEN RAISE EXCEPTION 'Administrador não foi atribuído'; END IF;
  IF EXISTS (SELECT 1 FROM "PlatformAdminAssignment" WHERE "userId" = 'unrelated-user') THEN RAISE EXCEPTION 'Usuário não solicitado recebeu acesso'; END IF;
  IF (SELECT count(*) FROM "SecurityAuditLog") <> 5 THEN RAISE EXCEPTION 'Auditoria incompleta'; END IF;
END $$;
`;

function run(label, input, expectedSuccess, expectedError = "") {
  const result = spawnSync("docker", ["compose", "-f", "docker-compose.local.yml", "exec", "-T", "postgres", "psql", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-U", "calculadora_local", "-d", "calculadora_nutricional"], {
    cwd: root, input, encoding: "utf8", timeout: 30_000,
  });
  const success = result.status === 0 && !result.error;
  if (success !== expectedSuccess || (!expectedSuccess && !result.stderr.includes(expectedError))) {
    throw new Error(`${label}: resultado inesperado (${result.error?.message ?? result.stderr.trim()})`);
  }
  console.log(`OK: ${label}`);
}

run("banco independente sem usuários-alvo", `${setup}${migration}ROLLBACK;`, true);
run("cinco concessões, auditoria e repetição idempotente", `${setup}${seeded}${migration}${migration}${assertComplete}ROLLBACK;`, true);
run("conjunto parcial rejeitado", `${setup}INSERT INTO "User" VALUES ('${ids[0]}');${migration}`, false, "conjunto incompleto");
run("membro inativo não recebe acesso", `${setup}${seeded}UPDATE "OrganizationMember" SET active = false WHERE "userId" = '${ids[0]}';${migration}`, false, "não está ativo");
run("revogação anterior não é contornada", `${setup}${seeded}INSERT INTO "PlatformAdminAssignment" VALUES ('old', '${ids[0]}', 'test-owner', 'REVOKED', CURRENT_TIMESTAMP, NULL, CURRENT_TIMESTAMP);${migration}`, false, "suspensa ou revogada");
run("owner preexistente impede administrador exclusivo", `${setup}${seeded}INSERT INTO "PlatformAdminAssignment" VALUES ('old', '${ids[2]}', 'test-owner', 'ACTIVE', CURRENT_TIMESTAMP, NULL, CURRENT_TIMESTAMP);${migration}`, false, "possui OWNER ativo ou agendado");
