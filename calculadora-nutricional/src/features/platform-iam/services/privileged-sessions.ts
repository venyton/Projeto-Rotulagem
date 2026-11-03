import "server-only";

import { createHash, createHmac, randomUUID } from "node:crypto";

import { Prisma, type PlatformPermissionRiskLevel } from "@prisma/client";
import { cookies, headers } from "next/headers";

import {
  canApprovePrivilegedSession,
  parsePrivilegedDuration,
  requiresIndependentApproval,
  requiresPrivilegedSession,
  sanitizePrivilegedJustification,
  sanitizePrivilegedPurpose,
  sanitizePrivilegedTarget,
  sanitizeTicketReference,
} from "@/features/platform-iam/domain/privileged-session";
import {
  PLATFORM_PERMISSIONS,
  type PlatformPermissionKey,
} from "@/features/platform-iam/domain/platform-authorization";
import {
  authorizePlatformRequest,
  type PlatformRequestAccess,
} from "@/features/platform-iam/services/platform-access";
import { prisma } from "@/lib/prisma";
import { getClientAddress } from "@/lib/security/request-rate-limit";
import { consumePersistentRateLimit } from "@/lib/security/persistent-rate-limit";
import { decryptTotpSecret, verifyTotpCodeWithReplay } from "@/lib/security/totp";

const STEP_UP_ATTEMPTS = 8;
const STEP_UP_WINDOW_MS = 15 * 60 * 1_000;
const APPROVAL_REQUEST_TTL_MS = 15 * 60 * 1_000;

export class PrivilegedAccessError extends Error {
  constructor(
    message: string,
    readonly code:
      | "ACCESS_DENIED"
      | "MFA_REQUIRED"
      | "MFA_INVALID"
      | "RATE_LIMITED"
      | "SESSION_REQUIRED"
      | "APPROVAL_REQUIRED"
      | "INVALID_REQUEST",
  ) {
    super(message);
    this.name = "PrivilegedAccessError";
  }
}

export type PrivilegedPlatformAccess = PlatformRequestAccess & {
  privilegedSessionId: string | null;
  permissionRiskLevel: PlatformPermissionRiskLevel | null;
};

function signingSecret() {
  const secret = process.env.NEXTAUTH_SECRET || process.env.TWO_FACTOR_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error("Configuração de vínculo da sessão privilegiada ausente.");
  }
  return secret;
}

function safeHash(value: string) {
  return createHmac("sha256", signingSecret()).update(value).digest("hex");
}

async function requestContext() {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const sessionCookie = cookieStore
    .getAll()
    .filter(({ name }) => ["next-auth.session-token", "__Secure-next-auth.session-token"].some(
      (base) => name === base || name.startsWith(`${base}.`),
    ))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(({ name, value }) => `${name}=${value}`)
    .join(";");
  if (!sessionCookie) throw new PrivilegedAccessError("Sessão autenticada não pôde ser vinculada.", "ACCESS_DENIED");

  const address = getClientAddress({ headers: requestHeaders });
  const incomingCorrelationId = requestHeaders.get("x-request-id")?.trim();

  return {
    sessionBindingHash: safeHash(sessionCookie),
    ipHash: safeHash(address),
    userAgent: requestHeaders.get("user-agent")?.slice(0, 512) || null,
    correlationId: incomingCorrelationId && incomingCorrelationId.length <= 128
      ? incomingCorrelationId
      : randomUUID(),
  };
}

async function verifyAndClaimTotp(
  tx: Prisma.TransactionClient,
  userId: string,
  code: string,
) {
  await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`privileged-step-up:${userId}`}))`);
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorEnabled: true,
      twoFactorSecret: true,
      twoFactorLastUsedStep: true,
    },
  });
  if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
    throw new PrivilegedAccessError("Ative o 2FA antes de solicitar acesso privilegiado.", "MFA_REQUIRED");
  }

  const result = await verifyTotpCodeWithReplay(
    decryptTotpSecret(user.twoFactorSecret),
    code,
    user.twoFactorLastUsedStep,
  );
  if (!result.valid) {
    throw new PrivilegedAccessError("Código 2FA inválido, expirado ou já utilizado.", "MFA_INVALID");
  }

  const claimed = await tx.user.updateMany({
    where: {
      id: userId,
      OR: [
        { twoFactorLastUsedStep: null },
        { twoFactorLastUsedStep: { lt: result.timeStep } },
      ],
    },
    data: {
      twoFactorLastUsedAt: new Date(),
      twoFactorLastUsedStep: result.timeStep,
    },
  });
  if (claimed.count !== 1) {
    throw new PrivilegedAccessError("Código 2FA já utilizado.", "MFA_INVALID");
  }
}

async function auditStepUpDenied(input: {
  userId: string | null;
  permission: string;
  targetType: string | null;
  targetId: string | null;
  reason: string;
}) {
  await prisma.securityAuditLog.create({
    data: {
      userId: input.userId,
      action: "platform.privileged_session.step_up_denied",
      riskLevel: "HIGH",
      actorType: "USER",
      permission: input.permission,
      targetType: input.targetType || "CONTROL_PLANE",
      targetId: input.targetId,
      result: "DENIED",
      reason: input.reason,
    },
  });
}

export async function requestPrivilegedSession(input: {
  permission: PlatformPermissionKey;
  purpose: string;
  justification: string;
  ticketReference: string;
  targetType: string;
  targetId: string;
  durationMinutes: string | number;
  twoFactorCode: string;
}) {
  const access = await authorizePlatformRequest({
    permission: input.permission,
    action: "platform.privileged_session.requested",
    targetType: input.targetType || "CONTROL_PLANE",
    targetId: input.targetId || undefined,
  });
  if (!access.allowed || !access.user) {
    throw new PrivilegedAccessError("A permissão base solicitada não pertence ao operador.", "ACCESS_DENIED");
  }

  const [permission, context] = await Promise.all([
    prisma.platformPermission.findUnique({
      where: { key: input.permission },
      select: { id: true, key: true, riskLevel: true },
    }),
    requestContext(),
  ]);
  if (!permission || !requiresPrivilegedSession(permission.riskLevel)) {
    throw new PrivilegedAccessError("A permissão informada não usa sessão privilegiada.", "INVALID_REQUEST");
  }

  const durationMinutes = parsePrivilegedDuration(input.durationMinutes);
  const purpose = sanitizePrivilegedPurpose(input.purpose);
  const justification = sanitizePrivilegedJustification(input.justification);
  const ticketReference = sanitizeTicketReference(input.ticketReference);
  const target = sanitizePrivilegedTarget(input.targetType, input.targetId);
  const rateLimit = await consumePersistentRateLimit(
    "platform.step_up",
    `${access.user.id}:${context.ipHash}`,
    { maxAttempts: STEP_UP_ATTEMPTS, windowMs: STEP_UP_WINDOW_MS },
  );
  if (!rateLimit.allowed) {
    await auditStepUpDenied({
      userId: access.user.id,
      permission: input.permission,
      targetType: target.targetType,
      targetId: target.targetId,
      reason: "rate_limited",
    });
    throw new PrivilegedAccessError(
      `Muitas tentativas. Tente novamente em ${rateLimit.retryAfterSeconds} segundos.`,
      "RATE_LIMITED",
    );
  }

  const now = new Date();
  const approvalRequired = requiresIndependentApproval(permission.riskLevel);
  try {
    return await prisma.$transaction(async (tx) => {
      await verifyAndClaimTotp(tx, access.user!.id, input.twoFactorCode);
      await tx.privilegedSession.updateMany({
        where: {
          requestedByUserId: access.user!.id,
          status: { in: ["ACTIVE", "PENDING_APPROVAL"] },
          expiresAt: { lte: now },
        },
        data: { status: "EXPIRED" },
      });

      const session = await tx.privilegedSession.create({
        data: {
          requestedByUserId: access.user!.id,
          platformPermissionId: permission.id,
          status: approvalRequired ? "PENDING_APPROVAL" : "ACTIVE",
          purpose,
          justification,
          ticketReference,
          targetType: target.targetType,
          targetId: target.targetId,
          requestedDurationMinutes: durationMinutes,
          sessionBindingHash: context.sessionBindingHash,
          correlationId: context.correlationId,
          ipHash: context.ipHash,
          userAgent: context.userAgent,
          requestedAt: now,
          mfaVerifiedAt: now,
          startedAt: approvalRequired ? null : now,
          expiresAt: new Date(now.getTime() + (approvalRequired ? APPROVAL_REQUEST_TTL_MS : durationMinutes * 60_000)),
        },
        select: {
          id: true,
          status: true,
          expiresAt: true,
          correlationId: true,
        },
      });

      await tx.securityAuditLog.create({
        data: {
          userId: access.user!.id,
          privilegedSessionId: session.id,
          action: approvalRequired
            ? "platform.privileged_session.approval_requested"
            : "platform.privileged_session.activated",
          riskLevel: permission.riskLevel,
          actorType: access.source === "BREAK_GLASS" ? "BREAK_GLASS" : "USER",
          actorRole: access.roleKeys.join(","),
          permission: permission.key,
          targetType: target.targetType || "CONTROL_PLANE",
          targetId: target.targetId,
          result: "SUCCESS",
          reason: justification,
          correlationId: context.correlationId,
          ipHash: context.ipHash,
          userAgent: context.userAgent,
          requestMetadataSafe: {
            purpose,
            ticketReference,
            durationMinutes,
            approvalRequired,
          },
        },
      });
      return session;
    });
  } catch (error) {
    if (error instanceof PrivilegedAccessError) {
      await auditStepUpDenied({
        userId: access.user.id,
        permission: input.permission,
        targetType: target.targetType,
        targetId: target.targetId,
        reason: error.code,
      });
    }
    throw error;
  }
}

export async function approvePrivilegedSession(input: {
  privilegedSessionId: string;
  twoFactorCode: string;
}) {
  const access = await authorizePlatformRequest({
    permission: PLATFORM_PERMISSIONS.SECURITY_OPERATORS_MANAGE,
    action: "platform.privileged_session.approval_reviewed",
    targetType: "PRIVILEGED_SESSION",
    targetId: input.privilegedSessionId,
  });
  if (!access.allowed || !access.user) {
    throw new PrivilegedAccessError("Aprovação exige a permissão de gerenciar operadores.", "ACCESS_DENIED");
  }

  const context = await requestContext();
  const rateLimit = await consumePersistentRateLimit(
    "platform.step_up.approval",
    `${access.user.id}:${context.ipHash}`,
    { maxAttempts: STEP_UP_ATTEMPTS, windowMs: STEP_UP_WINDOW_MS },
  );
  if (!rateLimit.allowed) throw new PrivilegedAccessError("Muitas tentativas de aprovação.", "RATE_LIMITED");

  return prisma.$transaction(async (tx) => {
    await verifyAndClaimTotp(tx, access.user!.id, input.twoFactorCode);
    const pending = await tx.privilegedSession.findUnique({
      where: { id: input.privilegedSessionId },
      include: { platformPermission: { select: { key: true, riskLevel: true } } },
    });
    const now = new Date();
    if (!pending || pending.platformPermission.riskLevel !== "CRITICAL") {
      throw new PrivilegedAccessError("Pedido crítico não encontrado.", "INVALID_REQUEST");
    }
    if (!canApprovePrivilegedSession({
      requestedByUserId: pending.requestedByUserId,
      approverUserId: access.user!.id,
      status: pending.status,
      expiresAt: pending.expiresAt,
      now,
    })) {
      throw new PrivilegedAccessError("O pedido expirou, já foi tratado ou pertence ao aprovador.", "APPROVAL_REQUIRED");
    }

    const approved = await tx.privilegedSession.updateMany({
      where: {
        id: pending.id,
        status: "PENDING_APPROVAL",
        expiresAt: { gt: now },
        requestedByUserId: { not: access.user!.id },
      },
      data: {
        status: "ACTIVE",
        approvedByUserId: access.user!.id,
        approvedAt: now,
        startedAt: now,
        expiresAt: new Date(now.getTime() + pending.requestedDurationMinutes * 60_000),
      },
    });
    if (approved.count !== 1) throw new PrivilegedAccessError("O pedido não está mais disponível.", "APPROVAL_REQUIRED");

    await tx.securityAuditLog.create({
      data: {
        userId: access.user!.id,
        privilegedSessionId: pending.id,
        action: "platform.privileged_session.approved",
        riskLevel: "CRITICAL",
        actorType: access.source === "BREAK_GLASS" ? "BREAK_GLASS" : "USER",
        actorRole: access.roleKeys.join(","),
        permission: pending.platformPermission.key,
        targetType: pending.targetType || "CONTROL_PLANE",
        targetId: pending.targetId,
        result: "SUCCESS",
        reason: pending.justification,
        correlationId: pending.correlationId,
        ipHash: context.ipHash,
        userAgent: context.userAgent,
        beforeJsonSafe: { status: "PENDING_APPROVAL" },
        afterJsonSafe: { status: "ACTIVE", approvedByUserId: access.user!.id },
      },
    });
    return { id: pending.id, status: "ACTIVE" as const };
  });
}

export async function revokePrivilegedSession(privilegedSessionId: string) {
  const access = await authorizePlatformRequest({
    permission: PLATFORM_PERMISSIONS.ACCESS,
    action: "platform.privileged_session.revocation_requested",
    targetType: "PRIVILEGED_SESSION",
    targetId: privilegedSessionId,
  });
  if (!access.allowed || !access.user) throw new PrivilegedAccessError("Acesso negado.", "ACCESS_DENIED");

  const current = await prisma.privilegedSession.findUnique({
    where: { id: privilegedSessionId },
    include: { platformPermission: { select: { key: true, riskLevel: true } } },
  });
  if (!current) throw new PrivilegedAccessError("Sessão não encontrada.", "INVALID_REQUEST");
  const canManage = access.permissionKeys.includes(PLATFORM_PERMISSIONS.SECURITY_OPERATORS_MANAGE);
  if (current.requestedByUserId !== access.user.id && !canManage) {
    throw new PrivilegedAccessError("Somente o titular ou Security Admin pode revogar.", "ACCESS_DENIED");
  }

  const now = new Date();
  const changed = await prisma.privilegedSession.updateMany({
    where: { id: current.id, status: { in: ["ACTIVE", "PENDING_APPROVAL"] } },
    data: { status: "REVOKED", revokedAt: now },
  });
  if (changed.count) {
    await prisma.securityAuditLog.create({
      data: {
        userId: access.user.id,
        privilegedSessionId: current.id,
        action: "platform.privileged_session.revoked",
        riskLevel: current.platformPermission.riskLevel,
        actorType: access.source === "BREAK_GLASS" ? "BREAK_GLASS" : "USER",
        actorRole: access.roleKeys.join(","),
        permission: current.platformPermission.key,
        targetType: current.targetType || "CONTROL_PLANE",
        targetId: current.targetId,
        result: "SUCCESS",
        correlationId: current.correlationId,
        beforeJsonSafe: { status: current.status },
        afterJsonSafe: { status: "REVOKED" },
      },
    });
  }
  return { changed: changed.count === 1 };
}

export async function authorizePrivilegedPlatformRequest(input: {
  permission: PlatformPermissionKey;
  action: string;
  targetType?: string;
  targetId?: string;
}): Promise<PrivilegedPlatformAccess> {
  const access = await authorizePlatformRequest(input);
  if (!access.allowed || !access.user) {
    return { ...access, privilegedSessionId: null, permissionRiskLevel: null };
  }

  const permission = await prisma.platformPermission.findUnique({
    where: { key: input.permission },
    select: { id: true, riskLevel: true },
  });
  if (!permission || !requiresPrivilegedSession(permission.riskLevel)) {
    return {
      ...access,
      privilegedSessionId: null,
      permissionRiskLevel: permission?.riskLevel ?? null,
    };
  }

  const context = await requestContext();
  const now = new Date();
  await prisma.privilegedSession.updateMany({
    where: {
      requestedByUserId: access.user.id,
      status: { in: ["ACTIVE", "PENDING_APPROVAL"] },
      expiresAt: { lte: now },
    },
    data: { status: "EXPIRED" },
  });
  const session = await prisma.privilegedSession.findFirst({
    where: {
      requestedByUserId: access.user.id,
      platformPermissionId: permission.id,
      status: "ACTIVE",
      startedAt: { lte: now },
      expiresAt: { gt: now },
      sessionBindingHash: context.sessionBindingHash,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
    },
    orderBy: { expiresAt: "desc" },
    select: { id: true, correlationId: true },
  });
  if (!session) {
    await prisma.securityAuditLog.create({
      data: {
        userId: access.user.id,
        action: `${input.action}.privileged_denied`,
        riskLevel: permission.riskLevel,
        actorType: access.source === "BREAK_GLASS" ? "BREAK_GLASS" : "USER",
        actorRole: access.roleKeys.join(","),
        permission: input.permission,
        targetType: input.targetType || "CONTROL_PLANE",
        targetId: input.targetId,
        result: "DENIED",
        reason: "privileged_session_required",
        correlationId: context.correlationId,
        ipHash: context.ipHash,
        userAgent: context.userAgent,
      },
    });
    return {
      ...access,
      allowed: false,
      privilegedSessionId: null,
      permissionRiskLevel: permission.riskLevel,
    };
  }

  return {
    ...access,
    privilegedSessionId: session.id,
    permissionRiskLevel: permission.riskLevel,
  };
}

export async function getActivePrivilegedSessionSummaries(userId: string) {
  const context = await requestContext();
  const now = new Date();
  return prisma.privilegedSession.findMany({
    where: {
      requestedByUserId: userId,
      status: "ACTIVE",
      startedAt: { lte: now },
      expiresAt: { gt: now },
      sessionBindingHash: context.sessionBindingHash,
    },
    orderBy: { expiresAt: "asc" },
    select: {
      id: true,
      expiresAt: true,
      targetType: true,
      targetId: true,
      platformPermission: { select: { key: true, name: true } },
    },
  });
}

export async function getPrivilegedSessionConsole(input: {
  userId: string;
  permissionKeys: readonly PlatformPermissionKey[];
  canApprove: boolean;
}) {
  const now = new Date();
  await prisma.privilegedSession.updateMany({
    where: { status: { in: ["ACTIVE", "PENDING_APPROVAL"] }, expiresAt: { lte: now } },
    data: { status: "EXPIRED" },
  });
  const [permissions, sessions] = await Promise.all([
    prisma.platformPermission.findMany({
      where: {
        key: { in: [...input.permissionKeys] },
        riskLevel: { in: ["HIGH", "CRITICAL"] },
      },
      orderBy: [{ riskLevel: "asc" }, { name: "asc" }],
      select: { key: true, name: true, description: true, riskLevel: true },
    }),
    prisma.privilegedSession.findMany({
      where: input.canApprove
        ? { OR: [{ requestedByUserId: input.userId }, { status: "PENDING_APPROVAL" }] }
        : { requestedByUserId: input.userId },
      orderBy: { requestedAt: "desc" },
      take: 100,
      select: {
        id: true,
        requestedByUserId: true,
        approvedByUserId: true,
        status: true,
        purpose: true,
        justification: true,
        ticketReference: true,
        targetType: true,
        targetId: true,
        requestedDurationMinutes: true,
        requestedAt: true,
        expiresAt: true,
        platformPermission: { select: { key: true, name: true, riskLevel: true } },
        requestedByUser: { select: { email: true, name: true } },
        approvedByUser: { select: { email: true, name: true } },
      },
    }),
  ]);
  return { permissions, sessions };
}

export function stableSessionFingerprintForTest(cookieValue: string, secret: string) {
  return createHash("sha256").update(`${secret}:${cookieValue}`).digest("hex");
}
