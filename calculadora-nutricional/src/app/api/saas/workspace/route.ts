import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rejectCrossOriginRequest } from "@/lib/security/request-origin";
import { ACTIVE_ORGANIZATION_COOKIE } from "@/features/saas/services/entitlements";
import { consumeRequestRateLimit, getRequestRateLimit, rateLimitResponse } from "@/lib/security/request-rate-limit";

const workspaceSchema = z.object({
  organizationId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
});

export async function POST(request: NextRequest) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > 4096) {
    return NextResponse.json({ error: "Workspace inválido" }, { status: 413 });
  }

  const parsed = workspaceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Workspace inválido" }, { status: 400 });
  }

  const membership = await prisma.organizationMember.findFirst({
    where: {
      organizationId: parsed.data.organizationId,
      user: { email: session.user.email },
      active: true,
      organization: { status: "ACTIVE" },
    },
    select: { id: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Workspace não encontrado" }, { status: 403 });
  }

  const requestLimit = await consumeRequestRateLimit(
    "workspace_writes",
    session.user.email,
    getRequestRateLimit("workspaceWrites"),
  );
  if (!requestLimit.allowed) {
    return rateLimitResponse(requestLimit, { error: "Limite temporário de alterações atingido." });
  }

  const response = NextResponse.json({ ok: true }, {
    headers: { "Cache-Control": "no-store" },
  });
  response.cookies.set(ACTIVE_ORGANIZATION_COOKIE, parsed.data.organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
