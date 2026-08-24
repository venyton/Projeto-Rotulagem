import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 8;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

let lastCleanupAt = 0;

export type PersistentRateLimitOptions = {
  maxAttempts?: number;
  windowMs?: number;
};

export type PersistentRateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds: number;
};

function keyHash(scope: string, key: string) {
  const salt = process.env.RATE_LIMIT_HASH_SALT || process.env.NEXTAUTH_SECRET || "dev";
  return createHash("sha256")
    .update(`${salt}:${scope}:${key.trim().toLowerCase()}`)
    .digest("hex");
}

function positiveInteger(value: number | undefined, fallback: number, maximum: number) {
  return Number.isInteger(value) && value && value > 0 ? Math.min(value, maximum) : fallback;
}

function retryAfterSeconds(resetAt: Date) {
  return Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
}

async function pruneExpiredRateLimitBuckets() {
  const now = Date.now();
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;

  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM "RateLimitBucket"
    WHERE "id" IN (
      SELECT "id"
      FROM "RateLimitBucket"
      WHERE "resetAt" <= NOW()
      ORDER BY "resetAt" ASC
      LIMIT 500
    )
  `).catch(() => undefined);
}

/**
 * Consumes one attempt atomically in PostgreSQL.
 *
 * The SQL intentionally keeps denied buckets at maxAttempts + 1 instead of
 * incrementing forever. This makes a burst cheap to store and lets RETURNING
 * tell us whether this request consumed an allowed slot.
 */
export async function consumePersistentRateLimit(
  scope: string,
  key: string,
  options: PersistentRateLimitOptions = {},
): Promise<PersistentRateLimitResult> {
  const maxAttempts = positiveInteger(options.maxAttempts, DEFAULT_MAX_ATTEMPTS, 1_000_000);
  const windowMs = positiveInteger(options.windowMs, DEFAULT_WINDOW_MS, 30 * 24 * 60 * 60 * 1000);
  const hash = keyHash(scope, key);
  const resetAt = new Date(Date.now() + windowMs);

  const rows = await prisma.$queryRaw<Array<{ attempts: number; resetAt: Date; allowed: boolean }>>(Prisma.sql`
    INSERT INTO "RateLimitBucket" ("id", "scope", "keyHash", "attempts", "resetAt", "createdAt", "updatedAt")
    VALUES (${randomUUID()}, ${scope}, ${hash}, 1, ${resetAt}, NOW(), NOW())
    ON CONFLICT ("scope", "keyHash")
    DO UPDATE SET
      "attempts" = CASE
        WHEN "RateLimitBucket"."resetAt" <= NOW() THEN 1
        WHEN "RateLimitBucket"."attempts" < ${maxAttempts} THEN "RateLimitBucket"."attempts" + 1
        ELSE ${maxAttempts + 1}
      END,
      "resetAt" = CASE
        WHEN "RateLimitBucket"."resetAt" <= NOW() THEN ${resetAt}
        ELSE "RateLimitBucket"."resetAt"
      END,
      "updatedAt" = NOW()
    RETURNING "attempts", "resetAt", ("attempts" <= ${maxAttempts}) AS "allowed"
  `);

  const row = rows[0];
  if (!row) throw new Error("Não foi possível registrar o limite de requisições.");

  void pruneExpiredRateLimitBuckets();

  return {
    allowed: Boolean(row.allowed),
    limit: maxAttempts,
    remaining: Math.max(0, maxAttempts - Math.min(Number(row.attempts), maxAttempts)),
    resetAt: row.resetAt,
    retryAfterSeconds: retryAfterSeconds(row.resetAt),
  };
}

export async function clearPersistentRateLimit(scope: string, key: string) {
  const hash = keyHash(scope, key);
  await prisma.rateLimitBucket.deleteMany({
    where: {
      scope,
      keyHash: hash,
    },
  });
}
