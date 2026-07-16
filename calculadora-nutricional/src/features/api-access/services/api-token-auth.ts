import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { hasEffectiveModuleAccess } from "@/features/saas/domain/module-access";
import { SAAS_MODULES, type SaaSModuleKey } from "@/features/saas/domain/modules";
import { PROFILE_PERMISSION_MODULES } from "@/features/settings/domain/profile-permissions";

export const API_TOKEN_PREFIX = "soizi_";

export function hashApiToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
  const token = match?.[1] || "";
  if (!token.startsWith(API_TOKEN_PREFIX) || token.length < 40 || token.length > 160) return null;
  return token;
}

export async function authenticateApiRequest(
  request: NextRequest,
  requiredModules: readonly SaaSModuleKey[] = [],
) {
  const rawToken = readBearerToken(request);
  if (!rawToken) return null;

  const token = await prisma.apiAccessToken.findUnique({
    where: { tokenHash: hashApiToken(rawToken) },
    select: {
      id: true,
      organizationId: true,
      userId: true,
      expiresAt: true,
      revokedAt: true,
    },
  });
  if (!token || token.revokedAt || (token.expiresAt && token.expiresAt.getTime() <= Date.now())) return null;

  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId: token.organizationId,
      userId: token.userId,
      active: true,
      organization: { status: "ACTIVE" },
    },
    select: {
      role: true,
      profileId: true,
      moduleGrants: {
        select: { moduleKey: true, enabled: true, expiresAt: true },
      },
      profile: {
        select: {
          permissions: { select: { moduleKey: true, enabled: true } },
        },
      },
      organization: {
        select: {
          entitlements: { select: { moduleKey: true, enabled: true, expiresAt: true } },
        },
      },
    },
  });
  if (!member) return null;

  const allowed = [SAAS_MODULES.API_ACCESS, ...requiredModules].every((moduleKey) =>
    hasEffectiveModuleAccess({
      moduleKey,
      organizationEntitlements: member.organization.entitlements,
      profilePermissions: member.profile?.permissions,
      hasProfile: Boolean(member.profileId),
      role: member.role,
      memberGrants: member.moduleGrants,
      profileControlledModules: PROFILE_PERMISSION_MODULES,
    }),
  );
  if (!allowed) return null;

  await prisma.apiAccessToken.update({
    where: { id: token.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    tokenId: token.id,
    organizationId: token.organizationId,
    userId: token.userId,
  };
}
