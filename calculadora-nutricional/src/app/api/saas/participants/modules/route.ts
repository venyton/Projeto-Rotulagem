import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { rejectCrossOriginRequest } from "@/lib/security/request-origin";
import { prisma } from "@/lib/prisma";
import { ALL_SAAS_MODULES, type SaaSModuleKey } from "@/features/saas/domain/modules";
import { hasEffectiveModuleAccess } from "@/features/saas/domain/module-access";
import {
  contextHasModuleAccess,
  getCurrentSaaSContext,
  grantParticipantModule,
} from "@/features/saas/services/entitlements";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { consumeRequestRateLimit, getRequestRateLimit, rateLimitResponse } from "@/lib/security/request-rate-limit";
import { databaseIdSchema } from "@/lib/validation/identifiers";
import { isProfilePermissionModule } from "@/features/settings/domain/profile-permissions";

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
        profileId: true,
        user: { select: { name: true, email: true } },
        profile: {
          select: {
            permissions: { select: { moduleKey: true, enabled: true } },
          },
        },
        moduleGrants: { select: { moduleKey: true, enabled: true, expiresAt: true } },
      },
    }),
    prisma.organizationEntitlement.findMany({
      where: { organizationId: context.organization.id },
      select: { moduleKey: true, enabled: true, expiresAt: true },
    }),
  ]);

  const memberDtos = members.map((member) => ({
    id: member.id,
    role: member.role,
    active: member.active,
    user: member.user,
    effectiveModules: ALL_SAAS_MODULES.filter((moduleKey) => hasEffectiveModuleAccess({
      moduleKey,
      organizationEntitlements: entitlements,
      profilePermissions: member.profile?.permissions,
      hasProfile: Boolean(member.profileId),
      role: member.role,
      memberGrants: member.moduleGrants,
      profileControlledModules: isProfilePermissionModule(moduleKey) ? [moduleKey] : [],
    })),
  }));

  return NextResponse.json(
    { members: memberDtos, organization: { entitlements } },
    { headers: { "Cache-Control": "no-store" } },
  );
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
