import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const localEnvPath = resolve(projectRoot, ".env.local");
const composeFile = "docker-compose.local.yml";
const localDatabaseUrl = "postgresql://calculadora_local:calculadora_local@127.0.0.1:54329/calculadora_nutricional?schema=public";
const databaseKeys = ["POSTGRES_PRISMA_URL", "POSTGRES_URL_NON_POOLING", "DATABASE_URL"];
const baselineMigration = "0_baseline_pre_prisma_migrate";
const baselineTables = ["User", "Ingredient", "CustomIngredient", "GeneratedTable", "TableItem"];

function parseEnv(contents) {
  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].replace(/^['"]|['"]$/g, "")]),
  );
}

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function output(command, args) {
  const result = spawnSync(command, args, { cwd: projectRoot, encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error((result.stderr || "Comando local falhou.").trim());
  return result.stdout.trim();
}

function assertLocalDatabaseUrl(value, key) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${key} em .env.local não é uma URL PostgreSQL válida.`);
  }

  const isLoopback = ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  if (url.protocol !== "postgresql:" || !isLoopback || url.port !== "54329") {
    throw new Error(`${key} em .env.local deve apontar para PostgreSQL local em 127.0.0.1:54329. Execução interrompida para proteger o banco remoto.`);
  }
}

function ensureLocalEnv() {
  const current = existsSync(localEnvPath) ? parseEnv(readFileSync(localEnvPath, "utf8")) : {};
  for (const key of databaseKeys) {
    if (current[key]) assertLocalDatabaseUrl(current[key], key);
  }

  const missing = databaseKeys.filter((key) => !current[key]);
  if (missing.length === 0) return current;

  const entries = missing.map((key) => `${key}="${localDatabaseUrl}"`).join("\n");
  const prefix = existsSync(localEnvPath) && readFileSync(localEnvPath, "utf8").trim()
    ? "\n"
    : "# Gerado para desenvolvimento local. Este arquivo é ignorado pelo Git.\n";
  appendFileSync(localEnvPath, `${prefix}${entries}\n`);
  return { ...current, ...Object.fromEntries(missing.map((key) => [key, localDatabaseUrl])) };
}

function localEnv() {
  const values = ensureLocalEnv();
  return Object.fromEntries(databaseKeys.map((key) => [key, values[key] ?? localDatabaseUrl]));
}

function localPsql(query) {
  return output("docker", [
    "compose", "-f", composeFile, "exec", "-T", "postgres", "psql",
    "-U", "calculadora_local", "-d", "calculadora_nutricional", "-qAt", "-c", query,
  ]);
}

function prepareLocalMigrationHistory(env) {
  const migrationTableExists = localPsql("SELECT to_regclass('public._prisma_migrations') IS NOT NULL;") === "t";
  const domainTableCount = Number(localPsql("SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations';"));
  const hasFailedMigration = migrationTableExists && localPsql("SELECT EXISTS (SELECT 1 FROM \"_prisma_migrations\" WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL);") === "t";

  if (!migrationTableExists && domainTableCount === 0) return;
  if (!migrationTableExists) {
    throw new Error("O banco local não está vazio e não possui _prisma_migrations. Faça baseline explícito ou recrie somente esse banco local.");
  }
  if (domainTableCount === 0 || hasFailedMigration) {
    throw new Error("O banco local possui histórico incompleto ou inconsistente. Execução interrompida sem reset automático.");
  }

  const baselineApplied = localPsql(`SELECT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '${baselineMigration}' AND finished_at IS NOT NULL);`) === "t";
  if (baselineApplied) return;

  const existingBaselineTables = Number(localPsql(`SELECT count(*) FROM unnest(ARRAY[${baselineTables.map((table) => `'${table}'`).join(", ")}]) AS expected(name) WHERE to_regclass('public."' || expected.name || '"') IS NOT NULL;`));
  if (existingBaselineTables !== baselineTables.length) {
    throw new Error("O banco local não contém todas as tabelas do baseline histórico. Execução interrompida sem marcar migration como aplicada.");
  }

  run("npx", ["prisma", "migrate", "resolve", "--applied", baselineMigration, "--schema=./prisma/schema.prisma"], env);
}

function migrateLocalDatabase() {
  const env = localEnv();
  prepareLocalMigrationHistory(env);
  run("npx", ["prisma", "migrate", "deploy", "--schema=./prisma/schema.prisma"], env);
  run("npx", ["prisma", "migrate", "status", "--schema=./prisma/schema.prisma"], env);
}

const action = process.argv[2];

try {
  if (action === "up") {
    ensureLocalEnv();
    run("docker", ["compose", "-f", composeFile, "up", "-d", "--wait"]);
  } else if (action === "migrate") {
    migrateLocalDatabase();
  } else if (action === "push") {
    const env = localEnv();
    console.warn("db push está restrito ao PostgreSQL local e não substitui uma migration versionada.");
    run("npx", ["prisma", "db", "push", "--schema=./prisma/schema.prisma"], env);
  } else if (action === "down") {
    run("docker", ["compose", "-f", composeFile, "down"]);
  } else if (action === "prepare") {
    ensureLocalEnv();
    run("docker", ["compose", "-f", composeFile, "up", "-d", "--wait"]);
    migrateLocalDatabase();
  } else {
    throw new Error("Use: node scripts/local-db.mjs <prepare|up|migrate|push|down>");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
