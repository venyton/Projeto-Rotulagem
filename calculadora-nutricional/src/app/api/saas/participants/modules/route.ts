import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { rejectCrossOriginRequest } from "@/lib/security/request-origin";
import { prisma } from "@/lib/prisma";
import { ALL_SAAS_MODULES, type SaaSModuleKey } from "@/features/saas/domain/modules";
import {
  contextHasModuleAccess,
  getCurrentSaaSContext,
  grantParticipantModule,
} from "@/features/saas/services/entitlements";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { consumeRequestRateLimit, getRequestRateLimit, rateLimitResponse } from "@/lib/security/request-rate-limit";
import { databaseIdSchema } from "@/lib/validation/identifiers";

const moduleSchema = z.object({
  organizationMemberId: databaseIdSchema,
  moduleKey: z.enum([...ALL_SAAS_MODULES] as [SaaSModuleKey, ...SaaSModuleKey[]]),
  enabled: z.boolean(),
});

async function getManageableContext() {
  const context = await getCurrentSaaSContext();
  if (!context || !contextHasModuleAccess(context, SAAS_MODULES.SETTINGS)) return null;
  return context;
}

export async function GET() {
  const context = await getManageableContext();
  if (!context) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const [members, entitlements] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId: context.organization.id, active: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        active: true,
        user: { select: { name: true, email: true } },
        moduleGrants: { select: { moduleKey: true, enabled: true } },
      },
    }),
    prisma.organizationEntitlement.findMany({
      where: { organizationId: context.organization.id },
      select: { moduleKey: true, enabled: true },
    }),
  ]);

  return NextResponse.json({ members, organization: { entitlements } }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;

  const context = await getManageableContext();
  if (!context) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > 16_384) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 413 });
  }

  const parsed = moduleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const requestLimit = await consumeRequestRateLimit(
    "workspace_writes",
    context.user.id,
    getRequestRateLimit("workspaceWrites"),
  );
  if (!requestLimit.allowed) {
    return rateLimitResponse(requestLimit, { error: "Limite temporário de alterações atingido." });
  }

  const result = await grantParticipantModule(parsed.data);
  if (result.error) return NextResponse.json(result, { status: 403 });
  return NextResponse.json(result);
}
