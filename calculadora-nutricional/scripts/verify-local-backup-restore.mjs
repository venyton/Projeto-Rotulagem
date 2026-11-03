import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const compose = ["compose", "-f", "docker-compose.local.yml", "exec", "-T", "postgres"];
const databaseKeys = ["POSTGRES_PRISMA_URL", "POSTGRES_URL_NON_POOLING", "DATABASE_URL"];
const sourceDatabase = "calculadora_nutricional";
const databasePrefix = "soizi_restore_test_";

function requireLocalDatabase() {
  const values = databaseKeys.map((key) => {
    const value = process.env[key];
    if (!value) throw new Error(`${key} explícita é obrigatória para o teste de recuperação.`);
    const url = new URL(value);
    if (
      url.protocol !== "postgresql:"
      || url.hostname !== "127.0.0.1"
      || url.port !== "54329"
      || url.username !== "calculadora_local"
      || url.pathname !== `/${sourceDatabase}`
    ) {
      throw new Error(`${key} recusada: o teste aceita somente o PostgreSQL local 127.0.0.1:54329/${sourceDatabase}.`);
    }
    return value;
  });
  assert.equal(new Set(values).size, 1, "As três URLs de banco devem apontar explicitamente para o mesmo banco local.");
}

function runDocker(args, { input, capture = false } = {}) {
  const result = spawnSync("docker", [...compose, ...args], {
    cwd: projectRoot,
    input,
    encoding: capture ? null : undefined,
    stdio: capture ? ["pipe", "pipe", "pipe"] : [input ? "pipe" : "inherit", "inherit", "inherit"],
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = capture ? Buffer.concat([result.stdout ?? Buffer.alloc(0), result.stderr ?? Buffer.alloc(0)]).toString("utf8").trim() : "";
    throw new Error(`docker ${args[0]} falhou com status ${result.status}.${detail ? ` ${detail}` : ""}`);
  }
  return capture ? result.stdout : Buffer.alloc(0);
}

function assertDisposableDatabaseName(name) {
  if (!new RegExp(`^${databasePrefix}[a-z0-9_]+$`).test(name)) {
    throw new Error(`Banco descartável recusado: ${name}`);
  }
}

function adminSql(sql, capture = false) {
  return runDocker(
    ["psql", "-U", "calculadora_local", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-qAt"],
    { input: Buffer.from(sql), capture },
  );
}

function databaseSnapshot(databaseName) {
  const output = runDocker(
    ["psql", "-U", "calculadora_local", "-d", databaseName, "-v", "ON_ERROR_STOP=1", "-qAt", "-c", `
      SELECT json_build_object(
        'tables', (SELECT count(*) FROM pg_tables WHERE schemaname = 'public'),
        'migrations', (SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL),
        'users', (SELECT count(*) FROM "User"),
        'organizations', (SELECT count(*) FROM "Organization"),
        'memberships', (SELECT count(*) FROM "OrganizationMember"),
        'subscriptions', (SELECT count(*) FROM "Subscription"),
        'auditEvents', (SELECT count(*) FROM "SecurityAuditLog")
      )::text;
    `],
    { capture: true },
  );
  return JSON.parse(output.toString("utf8").trim());
}

function dropDatabase(databaseName) {
  assertDisposableDatabaseName(databaseName);
  adminSql(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = '${databaseName}' AND pid <> pg_backend_pid();
    DROP DATABASE IF EXISTS "${databaseName}";
  `);
}

async function main() {
  requireLocalDatabase();
  const restoreDatabase = `${databasePrefix}${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  assertDisposableDatabaseName(restoreDatabase);
  const source = databaseSnapshot(sourceDatabase);
  const archive = runDocker(
    ["pg_dump", "-U", "calculadora_local", "-d", sourceDatabase, "--format=custom", "--no-owner", "--no-privileges"],
    { capture: true },
  );
  assert.ok(archive.length > 0, "O arquivo lógico local não pode ficar vazio.");
  const checksum = createHash("sha256").update(archive).digest("hex");

  try {
    dropDatabase(restoreDatabase);
    adminSql(`CREATE DATABASE "${restoreDatabase}" OWNER calculadora_local;`);
    runDocker(
      ["pg_restore", "-U", "calculadora_local", "-d", restoreDatabase, "--exit-on-error", "--no-owner", "--no-privileges"],
      { input: archive },
    );
    const restored = databaseSnapshot(restoreDatabase);
    assert.deepEqual(restored, source, "O banco restaurado divergiu do snapshot lógico de origem.");
    console.log(JSON.stringify({
      target: "127.0.0.1:54329/calculadora_nutricional",
      archiveFormat: "custom",
      archiveBytes: archive.length,
      sha256: checksum,
      snapshot: restored,
      restoreVerified: true,
      disposableDatabaseRemoved: true,
    }));
  } finally {
    dropDatabase(restoreDatabase);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Falha desconhecida no teste local de recuperação.");
  process.exitCode = 1;
});
