import "server-only";

import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import {
  type PlatformAuthorizationDecision,
  type PlatformPermissionKey,
  resolvePlatformAuthorization,
} from "@/features/platform-iam/domain/platform-authorization";
import { isInternalMasterEmail } from "@/features/master/domain/master-identity";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type PlatformRequestAccess = PlatformAuthorizationDecision & {
  user: {
    id: string;
    email: string;
    name: string | null;
    twoFactorEnabled: boolean;
  } | null;
};

async function getSafeRequestMetadata() {
  const requestHeaders = await headers();
  const incomingCorrelationId = requestHeaders.get("x-request-id")?.trim();
  const correlationId = incomingCorrelationId && incomingCorrelationId.length <= 128
    ? incomingCorrelationId
    : randomUUID();
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 512) ?? null;

  return { correlationId, userAgent };
}

export async function resolveCurrentPlatformAccess(
  requestedPermission: PlatformPermissionKey,
): Promise<PlatformRequestAccess> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return {
      ...resolvePlatformAuthorization({
        authenticated: false,
        requestedPermission,
        assignments: [],
        breakGlassEmail: false,
        twoFactorEnabled: false,
      }),
      user: null,
    };
  }

  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      twoFactorEnabled: true,
      platformAdminAssignments: {
        where: {
          status: "ACTIVE",
          startsAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        select: {
          status: true,
          startsAt: true,
          expiresAt: true,
          platformRole: {
            select: {
              key: true,
              permissions: {
                select: {
                  platformPermission: { select: { key: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return {
      ...resolvePlatformAuthorization({
        authenticated: false,
        requestedPermission,
        assignments: [],
        breakGlassEmail: false,
        twoFactorEnabled: false,
        now,
      }),
      user: null,
    };
  }

  const decision = resolvePlatformAuthorization({
    authenticated: true,
    requestedPermission,
    assignments: user.platformAdminAssignments.map((assignment) => ({
      roleKey: assignment.platformRole.key,
      status: assignment.status,
      startsAt: assignment.startsAt,
      expiresAt: assignment.expiresAt,
      permissionKeys: assignment.platformRole.permissions.map(
        ({ platformPermission }) => platformPermission.key,
      ),
    })),
    breakGlassEmail: isInternalMasterEmail(user.email),
    twoFactorEnabled: user.twoFactorEnabled,
    now,
  });

  return {
    ...decision,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      twoFactorEnabled: user.twoFactorEnabled,
    },
  };
}

export async function authorizePlatformRequest(input: {
  permission: PlatformPermissionKey;
  action: string;
  targetType?: string;
  targetId?: string;
}) {
  const [access, requestMetadata] = await Promise.all([
    resolveCurrentPlatformAccess(input.permission),
    getSafeRequestMetadata(),
  ]);

  await prisma.securityAuditLog.create({
    data: {
      userId: access.user?.id ?? null,
      action: input.action,
      riskLevel: access.allowed ? "LOW" : "MEDIUM",
      actorType: access.source === "BREAK_GLASS" ? "BREAK_GLASS" : "USER",
      actorRole: access.roleKeys.join(",") || null,
      permission: input.permission,
      targetType: input.targetType ?? "CONTROL_PLANE",
      targetId: input.targetId ?? null,
      result: access.allowed ? "SUCCESS" : "DENIED",
      reason: access.denialReason,
      correlationId: requestMetadata.correlationId,
      userAgent: requestMetadata.userAgent,
      requestMetadataSafe: {
        accessSource: access.source,
      } satisfies Prisma.InputJsonValue,
    },
  });

  return access;
}

export async function requirePlatformPagePermission(input: {
  permission: PlatformPermissionKey;
  action: string;
  targetId?: string;
}) {
  const access = await authorizePlatformRequest({
    permission: input.permission,
    action: input.action,
    targetType: "ADMIN_ROUTE",
    targetId: input.targetId,
  });

  if (!access.allowed) {
    if (access.denialReason === "unauthenticated") {
      redirect("/login?callbackUrl=/admin");
    }
    redirect("/dashboard");
  }

  return access;
}
