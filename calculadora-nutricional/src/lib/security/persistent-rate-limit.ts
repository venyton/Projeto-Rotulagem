import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 8;

function keyHash(scope: string, key: string) {
  const salt = process.env.RATE_LIMIT_HASH_SALT || process.env.NEXTAUTH_SECRET || "dev";
  return createHash("sha256")
    .update(`${salt}:${scope}:${key.trim().toLowerCase()}`)
    .digest("hex");
}

export async function isPersistentRateLimited(scope: string, key: string, maxAttempts = DEFAULT_MAX_ATTEMPTS) {
  const hash = keyHash(scope, key);
  const bucket = await prisma.rateLimitBucket.findUnique({
    where: {
      scope_keyHash: {
        scope,
        keyHash: hash,
      },
    },
  });

  if (!bucket) return false;
  if (bucket.resetAt.getTime() <= Date.now()) {
    await prisma.rateLimitBucket.delete({ where: { id: bucket.id } }).catch(() => null);
    return false;
  }

  return bucket.attempts >= maxAttempts;
}

export async function recordPersistentRateLimitFailure(scope: string, key: string, windowMs = DEFAULT_WINDOW_MS) {
  const hash = keyHash(scope, key);
  const existing = await prisma.rateLimitBucket.findUnique({
    where: {
      scope_keyHash: {
        scope,
        keyHash: hash,
      },
    },
  });

  if (!existing || existing.resetAt.getTime() <= Date.now()) {
    await prisma.rateLimitBucket.upsert({
      where: {
        scope_keyHash: {
          scope,
          keyHash: hash,
        },
      },
      create: {
        scope,
        keyHash: hash,
        attempts: 1,
        resetAt: new Date(Date.now() + windowMs),
      },
      update: {
        attempts: 1,
        resetAt: new Date(Date.now() + windowMs),
      },
    });
    return;
  }

  await prisma.rateLimitBucket.update({
    where: { id: existing.id },
    data: { attempts: { increment: 1 } },
  });
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
