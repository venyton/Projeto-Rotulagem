import { createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  MAX_PASSWORD_LENGTH,
  PASSWORD_HASH_ROUNDS,
  validatePasswordStrength,
} from "@/lib/security/password";
import {
  clearPersistentRateLimit,
  consumePersistentRateLimit,
} from "@/lib/security/persistent-rate-limit";
import { rejectCrossOriginRequest } from "@/lib/security/request-origin";
import { getClientAddress, getRequestRateLimit, rateLimitResponse } from "@/lib/security/request-rate-limit";
import { passwordResetTokenSchema } from "@/lib/validation/identifiers";

const requestSchema = z.object({
  token: passwordResetTokenSchema,
  password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
}).strict();

function json(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (!Number.isFinite(contentLength) || contentLength > 4096) {
    return json({ error: "Solicitação inválida." }, 400);
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Token inválido ou expirado." }, 400);

  const hashedToken = createHash("sha256").update(parsed.data.token).digest("hex");
  const scope = "auth.password_reset.consume";

  try {
    const ipLimit = await consumePersistentRateLimit(
      "auth.password_reset.consume.ip",
      getClientAddress(request),
      getRequestRateLimit("loginIp"),
    );
    if (!ipLimit.allowed) {
      return rateLimitResponse(ipLimit, { error: "Muitas tentativas. Tente novamente mais tarde." });
    }

    const rateLimit = await consumePersistentRateLimit(scope, hashedToken, {
      maxAttempts: 8,
      windowMs: 15 * 60 * 1000,
    });
    if (!rateLimit.allowed) {
      return json({ error: "Token inválido ou expirado." }, 400);
    }

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpiresAt: { gt: new Date() },
      },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return json({ error: "Token inválido ou expirado." }, 400);
    }

    const passwordError = validatePasswordStrength(parsed.data.password, user);
    if (passwordError) return json({ error: passwordError }, 400);

    const newPasswordHash = await hash(parsed.data.password, PASSWORD_HASH_ROUNDS);
    const updated = await prisma.user.updateMany({
      where: {
        id: user.id,
        resetPasswordToken: hashedToken,
        resetPasswordExpiresAt: { gt: new Date() },
      },
      data: {
        password: newPasswordHash,
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
      },
    });

    if (updated.count !== 1) {
      return json({ error: "Token inválido ou expirado." }, 400);
    }

    await clearPersistentRateLimit(scope, hashedToken);
    return json({ success: true });
  } catch {
    return json({ error: "Erro interno no servidor." }, 500);
  }
}
