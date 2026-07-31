import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { loadEnvConfig } from "@next/env";

function assertLocalDatabaseUrl(value: string | undefined, name: string) {
  if (!value) throw new Error(`${name} não está configurada.`);
  const url = new URL(value);
  const localHost = ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  if (url.protocol !== "postgresql:" || !localHost || url.port !== "54329") {
    throw new Error(`${name} deve apontar para o PostgreSQL local em 127.0.0.1:54329.`);
  }
}

async function main() {
  loadEnvConfig(process.cwd());
  for (const key of ["POSTGRES_PRISMA_URL", "POSTGRES_URL_NON_POOLING", "DATABASE_URL"]) {
    assertLocalDatabaseUrl(process.env[key], key);
  }

  const { consumePersistentRateLimit, clearPersistentRateLimit } = await import("@/lib/security/persistent-rate-limit");
  const { prisma } = await import("@/lib/prisma");
  const scope = `test.rate_limit.atomic.${randomUUID()}`;
  const key = randomUUID();
  const maxAttempts = 5;

  try {
    const results = await Promise.all(
      Array.from({ length: 24 }, () =>
        consumePersistentRateLimit(scope, key, { maxAttempts, windowMs: 60_000 }),
      ),
    );

    assert.equal(results.filter((result) => result.allowed).length, maxAttempts);
    assert.equal(results.filter((result) => !result.allowed).length, 24 - maxAttempts);
    assert.ok(results.every((result) => result.remaining >= 0 && result.remaining <= maxAttempts));
    assert.ok(results.some((result) => !result.allowed && result.retryAfterSeconds >= 1));

    console.info(`Rate limit atômico validado: ${maxAttempts} de 24 requisições concorrentes foram permitidas.`);
  } finally {
    await clearPersistentRateLimit(scope, key);
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
