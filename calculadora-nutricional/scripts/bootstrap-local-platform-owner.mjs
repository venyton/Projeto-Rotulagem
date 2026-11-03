import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Prisma, PrismaClient } from "@prisma/client";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const allowedDatabase = {
  host: "127.0.0.1",
  port: "54329",
  database: "calculadora_nutricional",
};
const databaseKeys = ["POSTGRES_PRISMA_URL", "POSTGRES_URL_NON_POOLING", "DATABASE_URL"];

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

function loadDatabaseConfig() {
  const localEnvPath = resolve(projectRoot, ".env.local");
  const localEnv = existsSync(localEnvPath)
    ? parseEnv(readFileSync(localEnvPath, "utf8"))
    : {};
  const configuredUrls = databaseKeys
    .map((key) => [key, process.env[key] || localEnv[key]])
    .filter(([, value]) => Boolean(value));
  const primaryUrl = process.env.POSTGRES_PRISMA_URL || localEnv.POSTGRES_PRISMA_URL;

  if (!primaryUrl) {
    throw new Error("POSTGRES_PRISMA_URL não foi configurada para o banco local.");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("O bootstrap local é bloqueado quando NODE_ENV=production.");
  }

  for (const [key, rawUrl] of configuredUrls) {
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new Error(`${key} não contém uma URL PostgreSQL válida.`);
    }

    const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    if (
      parsed.protocol !== "postgresql:" ||
      parsed.hostname !== allowedDatabase.host ||
      parsed.port !== allowedDatabase.port ||
      database !== allowedDatabase.database
    ) {
      throw new Error(
        `Bootstrap recusado: ${key} precisa apontar para ${allowedDatabase.host}:${allowedDatabase.port}/${allowedDatabase.database}.`,
      );
    }
  }

  return primaryUrl;
}

function requestedEmail() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log("Uso: npm run bootstrap:local-owner -- --email usuario@exemplo.com");
    process.exit(0);
  }

  const emailIndex = args.indexOf("--email");
  const email = emailIndex >= 0 ? args[emailIndex + 1]?.trim().toLowerCase() : "";
  const unsupportedArgs = args.filter((arg, index) => arg !== "--email" && index !== emailIndex + 1);
  if (
    unsupportedArgs.length > 0 ||
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error("Informe uma conta existente com --email usuario@exemplo.com.");
  }
  return email;
}

async function bootstrapLocalOwner(prisma, email) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext('soizi-local-platform-owner-bootstrap'))`);

    const [user, role] = await Promise.all([
      tx.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          twoFactorEnabled: true,
          twoFactorSecret: true,
          twoFactorConfirmedAt: true,
        },
      }),
      tx.platformRole.findUnique({ where: { key: "PLATFORM_OWNER" }, select: { id: true } }),
    ]);

    if (!user) throw new Error("A conta indicada ainda não existe no banco local.");
    if (!role) throw new Error("O perfil PLATFORM_OWNER não existe. Aplique as migrations locais primeiro.");
    if (!user.twoFactorEnabled || !user.twoFactorSecret || !user.twoFactorConfirmedAt) {
      throw new Error("A conta precisa ter 2FA ativo e confirmado antes do bootstrap.");
    }

    const now = new Date();
    const existingOwner = await tx.platformAdminAssignment.findFirst({
      where: {
        platformRoleId: role.id,
        status: "ACTIVE",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { id: true, userId: true, startsAt: true },
    });

    if (existingOwner) {
      if (existingOwner.userId === user.id && existingOwner.startsAt <= now) {
        return { created: false, email: user.email };
      }
      throw new Error("Já existe uma atribuição de proprietário ativa ou agendada; o bootstrap local só cria o primeiro.");
    }

    const assignment = await tx.platformAdminAssignment.create({
      data: {
        userId: user.id,
        platformRoleId: role.id,
        assignedByUserId: null,
        expiresAt: null,
      },
      select: { id: true },
    });

    await tx.securityAuditLog.create({
      data: {
        action: "platform.security.operator.local_bootstrap",
        riskLevel: "CRITICAL",
        actorType: "LOCAL_BOOTSTRAP",
        actorRole: "LOCAL_DEVELOPMENT",
        permission: "platform.security.operators.manage",
        targetType: "PLATFORM_USER",
        targetId: user.id,
        result: "SUCCESS",
        reason: "Primeiro proprietário criado pelo bootstrap restrito ao banco local.",
        correlationId: randomUUID(),
        afterJsonSafe: {
          assignmentId: assignment.id,
          roleKey: "PLATFORM_OWNER",
          expiresAt: null,
          scope: "LOCAL_ONLY",
        },
      },
    });

    return { created: true, email: user.email };
  });
}

async function main() {
  const email = requestedEmail();
  const databaseUrl = loadDatabaseConfig();
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  try {
    const result = await bootstrapLocalOwner(prisma, email);
    console.log(
      result.created
        ? `Proprietário local criado para ${result.email}.`
        : `${result.email} já possui o perfil de proprietário local. Nenhuma alteração foi feita.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Bootstrap local não concluído.");
  process.exitCode = 1;
});
