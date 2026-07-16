import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  isPersistentRateLimited,
  recordPersistentRateLimitFailure,
} from "@/lib/security/persistent-rate-limit";
import { sendPasswordResetEmail } from "@/lib/security/password-reset-email";
import { rejectCrossOriginRequest } from "@/lib/security/request-origin";

const requestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
}).strict();

const successResponse = () => NextResponse.json(
  { success: true },
  { headers: { "Cache-Control": "no-store" } },
);

export async function POST(request: NextRequest) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (!Number.isFinite(contentLength) || contentLength > 4096) return successResponse();

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return successResponse();

  const { email } = parsed.data;
  const scope = "auth.password_reset.request";

  try {
    if (await isPersistentRateLimited(scope, email, 5)) return successResponse();
    await recordPersistentRateLimitFailure(scope, email, 60 * 60 * 1000);

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (!user) return successResponse();

    const rawToken = randomBytes(32).toString("hex");
    const hashedToken = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: hashedToken, resetPasswordExpiresAt: expiresAt },
    });

    const delivered = await sendPasswordResetEmail(user.email, rawToken);
    if (!delivered) {
      await prisma.user.updateMany({
        where: { id: user.id, resetPasswordToken: hashedToken },
        data: { resetPasswordToken: null, resetPasswordExpiresAt: null },
      });
    }

    return successResponse();
  } catch {
    return successResponse();
  }
}
