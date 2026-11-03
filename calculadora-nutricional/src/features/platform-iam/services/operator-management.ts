import "server-only";

import { Prisma } from "@prisma/client";

import {
  PLATFORM_PERMISSIONS,
  type PlatformRoleKey,
} from "@/features/platform-iam/domain/platform-authorization";
import { authorizePrivilegedPlatformRequest } from "@/features/platform-iam/services/privileged-sessions";
import { prisma } from "@/lib/prisma";

export class OperatorManagementError extends Error {
  constructor(
    message: string,
    public readonly code: OperatorManagementErrorCode,
  ) {
    super(message);
    this.name = "OperatorManagementError";
  }
}

export type OperatorManagementErrorCode =
  | "UNAUTHENTICATED"
  | "ACCESS_DENIED"
  | "PRIVILEGED_SESSION_REQUIRED"
  | "INVALID_EXPIRY"
  | "NOT_FOUND"
  | "TWO_FACTOR_REQUIRED"
  | "ASSIGNMENT_EXISTS"
  | "LAST_OWNER_REQUIRED"
  | "ALREADY_REVOKED";

type CreatePlatformOperatorAssignmentInput = {
  userId: string;
  expiresAt: Date | null;
} & (
  | { platformRoleId: string; platformRoleKey?: never }
  | { platformRoleKey: PlatformRoleKey; platformRoleId?: never }
);

export async function createPlatformOperatorAssignment(input: CreatePlatformOperatorAssignmentInput) {
  const access = await authorizePrivilegedPlatformRequest({
    permission: PLATFORM_PERMISSIONS.SECURITY_OPERATORS_MANAGE,
    action: "platform.security.operator.create_requested",
    targetType: "PLATFORM_USER",
    targetId: input.userId,
  });
  if (!access.user) {
    throw new OperatorManagementError("Autenticação necessária.", "UNAUTHENTICATED");
  }
  if (access.denialReason) {
    throw new OperatorManagementError("Sem permissão para administrar operadores da plataforma.", "ACCESS_DENIED");
  }
  if (!access.allowed || !access.privilegedSessionId) {
    throw new OperatorManagementError("É necessária uma sessão crítica aprovada para este usuário de destino.", "PRIVILEGED_SESSION_REQUIRED");
  }
  const now = new Date();
  if (input.expiresAt && input.expiresAt <= now) {
    throw new OperatorManagementError("A expiração deve estar no futuro.", "INVALID_EXPIRY");
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`platform-operator:${input.userId}`}))`);
    const [target, role] = await Promise.all([
      tx.user.findUnique({ where: { id: input.userId }, select: { id: true, email: true, twoFactorEnabled: true } }),
      input.platformRoleKey !== undefined
        ? tx.platformRole.findUnique({ where: { key: input.platformRoleKey }, select: { id: true, key: true, name: true } })
        : tx.platformRole.findUnique({ where: { id: input.platformRoleId }, select: { id: true, key: true, name: true } }),
    ]);
    if (!target || !role) throw new OperatorManagementError("Usuário ou role não encontrado.", "NOT_FOUND");
    if (!target.twoFactorEnabled) {
      throw new OperatorManagementError("O novo operador precisa ativar 2FA antes do assignment.", "TWO_FACTOR_REQUIRED");
    }
    const duplicate = await tx.platformAdminAssignment.findFirst({
      where: {
        userId: target.id,
        platformRoleId: role.id,
        status: "ACTIVE",
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new OperatorManagementError("Já existe assignment ativo para essa role.", "ASSIGNMENT_EXISTS");
    }

    const assignment = await tx.platformAdminAssignment.create({
      data: {
        userId: target.id,
        platformRoleId: role.id,
        assignedByUserId: access.user!.id,
        expiresAt: input.expiresAt,
      },
      select: {
        id: true,
        userId: true,
        status: true,
        startsAt: true,
        expiresAt: true,
        platformRole: { select: { key: true } },
      },
    });
    await tx.securityAuditLog.create({
      data: {
        userId: access.user!.id,
        privilegedSessionId: access.privilegedSessionId,
        action: "platform.security.operator.created",
        riskLevel: "CRITICAL",
        actorType: access.source === "BREAK_GLASS" ? "BREAK_GLASS" : "USER",
        actorRole: access.roleKeys.join(","),
        permission: PLATFORM_PERMISSIONS.SECURITY_OPERATORS_MANAGE,
        targetType: "PLATFORM_USER",
        targetId: target.id,
        result: "SUCCESS",
        reason: "operator_assignment_created",
        afterJsonSafe: {
          assignmentId: assignment.id,
          roleKey: role.key,
          expiresAt: input.expiresAt?.toISOString() ?? null,
        },
      },
    });
    return assignment;
  });
}

export async function revokePlatformOperatorAssignment(assignmentId: string) {
  const assignment = await prisma.platformAdminAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      userId: true,
      status: true,
      platformRole: { select: { key: true } },
    },
  });
  if (!assignment) throw new OperatorManagementError("Assignment não encontrado.", "NOT_FOUND");
  const access = await authorizePrivilegedPlatformRequest({
    permission: PLATFORM_PERMISSIONS.SECURITY_OPERATORS_MANAGE,
    action: "platform.security.operator.revoke_requested",
    targetType: "PLATFORM_USER",
    targetId: assignment.userId,
  });
  if (!access.user) {
    throw new OperatorManagementError("Autenticação necessária.", "UNAUTHENTICATED");
  }
  if (access.denialReason) {
    throw new OperatorManagementError("Sem permissão para administrar operadores da plataforma.", "ACCESS_DENIED");
  }
  if (!access.allowed || !access.privilegedSessionId) {
    throw new OperatorManagementError("É necessária uma sessão crítica aprovada para este usuário de destino.", "PRIVILEGED_SESSION_REQUIRED");
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext('platform-owner-assignment'))`);
    const now = new Date();
    if (assignment.platformRole.key === "PLATFORM_OWNER" && assignment.status === "ACTIVE") {
      const activeOwners = await tx.platformAdminAssignment.count({
        where: {
          status: "ACTIVE",
          startsAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          platformRole: { key: "PLATFORM_OWNER" },
        },
      });
      if (activeOwners <= 1) {
        throw new OperatorManagementError("O último Platform Owner ativo não pode ser revogado.", "LAST_OWNER_REQUIRED");
      }
    }

    const changed = await tx.platformAdminAssignment.updateMany({
      where: { id: assignment.id, status: { not: "REVOKED" } },
      data: { status: "REVOKED", expiresAt: now },
    });
    if (changed.count !== 1) throw new OperatorManagementError("Assignment já revogado.", "ALREADY_REVOKED");
    await tx.privilegedSession.updateMany({
      where: { requestedByUserId: assignment.userId, status: { in: ["ACTIVE", "PENDING_APPROVAL"] } },
      data: { status: "REVOKED", revokedAt: now },
    });
    await tx.securityAuditLog.create({
      data: {
        userId: access.user!.id,
        privilegedSessionId: access.privilegedSessionId,
        action: "platform.security.operator.revoked",
        riskLevel: "CRITICAL",
        actorType: access.source === "BREAK_GLASS" ? "BREAK_GLASS" : "USER",
        actorRole: access.roleKeys.join(","),
        permission: PLATFORM_PERMISSIONS.SECURITY_OPERATORS_MANAGE,
        targetType: "PLATFORM_USER",
        targetId: assignment.userId,
        result: "SUCCESS",
        reason: "operator_assignment_revoked",
        beforeJsonSafe: { assignmentId: assignment.id, status: assignment.status, roleKey: assignment.platformRole.key },
        afterJsonSafe: { status: "REVOKED", privilegedSessionsRevoked: true },
      },
    });
    return { changed: true };
  });
}
