import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { generate, generateSecret } from "otplib";

import { privilegedSessionCoversScope } from "../src/features/platform-iam/domain/privileged-session";
import { verifyTotpCodeWithReplay } from "../src/lib/security/totp";

const databaseUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("URL local obrigatória.");
const target = new URL(databaseUrl);
if (!(["127.0.0.1", "localhost"].includes(target.hostname) && target.port === "54329")) {
  throw new Error(`Runtime privilegiado recusou alvo não local: ${target.hostname}:${target.port}`);
}

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const marker = randomUUID();
const makerEmail = `stage11-maker-${marker}@example.test`;
const checkerEmail = `stage11-checker-${marker}@example.test`;

async function main() {
  const [highPermission, criticalPermission] = await Promise.all([
    prisma.platformPermission.findUniqueOrThrow({ where: { key: "platform.entitlements.override" } }),
    prisma.platformPermission.findUniqueOrThrow({ where: { key: "platform.security.operators.manage" } }),
  ]);
  const [maker, checker] = await Promise.all([
    prisma.user.create({ data: { email: makerEmail, name: "Stage 11 Maker" } }),
    prisma.user.create({ data: { email: checkerEmail, name: "Stage 11 Checker" } }),
  ]);
  const now = new Date();
  const binding = "a".repeat(64);

  try {
    const secret = generateSecret({ length: 20 });
    const token = await generate({ secret, digits: 6, period: 30 });
    const firstVerification = await verifyTotpCodeWithReplay(secret, token, null);
    if (!firstVerification.valid) throw new Error("Primeiro TOTP deveria ser válido.");
    const replayVerification = await verifyTotpCodeWithReplay(secret, token, firstVerification.timeStep);
    if (replayVerification.valid) throw new Error("Replay de TOTP não foi bloqueado.");

    const active = await prisma.privilegedSession.create({
      data: {
        requestedByUserId: maker.id,
        platformPermissionId: highPermission.id,
        status: "ACTIVE",
        purpose: "Validar enforcement local",
        justification: "Evidência automatizada da etapa onze.",
        targetType: "ORGANIZATION",
        targetId: "organization-a",
        requestedDurationMinutes: 5,
        sessionBindingHash: binding,
        correlationId: marker,
        requestedAt: now,
        mfaVerifiedAt: now,
        startedAt: now,
        expiresAt: new Date(now.getTime() + 5 * 60_000),
      },
      include: { platformPermission: { select: { key: true } } },
    });
    const scopeAccepted = privilegedSessionCoversScope({
      permissionKey: active.platformPermission.key,
      targetType: active.targetType,
      targetId: active.targetId,
      sessionBindingHash: active.sessionBindingHash.trim(),
      status: active.status,
      startedAt: active.startedAt,
      expiresAt: active.expiresAt,
    }, {
      permissionKey: highPermission.key,
      targetType: "ORGANIZATION",
      targetId: "organization-a",
      sessionBindingHash: binding,
    }, now);
    if (!scopeAccepted) throw new Error("Sessão válida não cobriu o escopo exato.");

    const crossBinding = await prisma.privilegedSession.count({
      where: { id: active.id, sessionBindingHash: "b".repeat(64) },
    });
    if (crossBinding !== 0) throw new Error("Outro vínculo encontrou a sessão.");

    const critical = await prisma.privilegedSession.create({
      data: {
        requestedByUserId: maker.id,
        platformPermissionId: criticalPermission.id,
        status: "PENDING_APPROVAL",
        purpose: "Validar maker checker",
        justification: "Pedido crítico com aprovação independente.",
        targetType: "PLATFORM_USER",
        targetId: checker.id,
        requestedDurationMinutes: 10,
        sessionBindingHash: binding,
        correlationId: marker,
        requestedAt: now,
        mfaVerifiedAt: now,
        expiresAt: new Date(now.getTime() + 15 * 60_000),
      },
    });
    const approved = await prisma.privilegedSession.update({
      where: { id: critical.id },
      data: {
        status: "ACTIVE",
        approvedByUserId: checker.id,
        approvedAt: now,
        startedAt: now,
        expiresAt: new Date(now.getTime() + 10 * 60_000),
      },
    });
    if (approved.approvedByUserId !== checker.id) throw new Error("Maker-checker não persistiu.");

    let selfApprovalRejected = false;
    try {
      await prisma.privilegedSession.create({
        data: {
          requestedByUserId: maker.id,
          approvedByUserId: maker.id,
          platformPermissionId: criticalPermission.id,
          status: "ACTIVE",
          purpose: "Autoaprovação inválida",
          justification: "Esta gravação precisa ser rejeitada pelo banco.",
          targetType: "PLATFORM_USER",
          targetId: maker.id,
          requestedDurationMinutes: 5,
          sessionBindingHash: binding,
          correlationId: marker,
          requestedAt: now,
          mfaVerifiedAt: now,
          approvedAt: now,
          startedAt: now,
          expiresAt: new Date(now.getTime() + 5 * 60_000),
        },
      });
    } catch {
      selfApprovalRejected = true;
    }
    if (!selfApprovalRejected) throw new Error("Constraint permitiu autoaprovação.");

    await prisma.securityAuditLog.create({
      data: {
        userId: maker.id,
        privilegedSessionId: active.id,
        action: "stage11.runtime.proof",
        riskLevel: "HIGH",
        permission: highPermission.key,
        targetType: "ORGANIZATION",
        targetId: "organization-a",
        result: "SUCCESS",
        correlationId: marker,
      },
    });
    const correlatedAudit = await prisma.securityAuditLog.count({
      where: { correlationId: marker, privilegedSessionId: active.id },
    });
    if (correlatedAudit !== 1) throw new Error("Auditoria não ficou ligada à sessão privilegiada.");

    console.log(JSON.stringify({
      target: `${target.hostname}:${target.port}`,
      totpReplayRejected: true,
      scopeAccepted,
      crossBindingRejected: crossBinding === 0,
      makerCheckerPersisted: true,
      selfApprovalRejected,
      auditLinked: correlatedAudit === 1,
    }));
  } finally {
    await prisma.securityAuditLog.deleteMany({ where: { correlationId: marker } });
    await prisma.privilegedSession.deleteMany({ where: { correlationId: marker } });
    await prisma.user.deleteMany({ where: { email: { in: [makerEmail, checkerEmail] } } });
  }
}

main().finally(() => prisma.$disconnect());
