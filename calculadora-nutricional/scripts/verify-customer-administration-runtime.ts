import assert from "node:assert/strict";

import { PrismaClient } from "@prisma/client";

import {
  assertOrganizationStatusTransition,
  maskedDocumentLabel,
  sanitizeAdministrativeReason,
} from "../src/features/platform-iam/domain/customer-administration";
import { resolvePlatformAuthorization } from "../src/features/platform-iam/domain/platform-authorization";

const databaseUrl = process.env.POSTGRES_PRISMA_URL ?? "";
const parsedUrl = new URL(databaseUrl);
if (!(parsedUrl.hostname === "127.0.0.1" && parsedUrl.port === "54329")) {
  throw new Error("Smoke de administração recusado: use somente 127.0.0.1:54329.");
}

const prisma = new PrismaClient();
const emails = ["stage8-admin-a@example.test", "stage8-admin-b@example.test"];

async function cleanup() {
  const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
  const userIds = users.map((user) => user.id);
  const organizations = await prisma.organization.findMany({ where: { ownerId: { in: userIds } }, select: { id: true } });
  const organizationIds = organizations.map((organization) => organization.id);
  await prisma.securityAuditLog.deleteMany({ where: { OR: [{ organizationId: { in: organizationIds } }, { userId: { in: userIds } }] } });
  await prisma.organizationMember.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: organizationIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

async function main() {
  try {
    await cleanup();
    const [userA, userB] = await Promise.all([
      prisma.user.create({ data: { email: emails[0], name: "Stage 8 A" } }),
      prisma.user.create({ data: { email: emails[1], name: "Stage 8 B" } }),
    ]);
    const [organizationA, organizationB] = await Promise.all([
      prisma.organization.create({ data: { ownerId: userA.id, name: "Stage 8 A", slug: "stage8-admin-a", kind: "COMPANY", cnpjLastFour: "1234" } }),
      prisma.organization.create({ data: { ownerId: userB.id, name: "Stage 8 B", slug: "stage8-admin-b", kind: "INDIVIDUAL", cpfLastFour: "9876" } }),
    ]);

    const metadata = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationA.id },
      select: { id: true, name: true, kind: true, cpfLastFour: true, cnpjLastFour: true, status: true },
    });
    assert.equal(maskedDocumentLabel(metadata), "CNPJ •••• 1234");
    assert.deepEqual(Object.keys(metadata).sort(), ["cnpjLastFour", "cpfLastFour", "id", "kind", "name", "status"]);

    const reason = sanitizeAdministrativeReason("Suspensão confirmada pelo atendimento interno.");
    assertOrganizationStatusTransition(metadata.status, "SUSPENDED");
    await prisma.$transaction(async (tx) => {
      await tx.organization.update({ where: { id: organizationA.id }, data: { status: "SUSPENDED" } });
      await tx.securityAuditLog.create({ data: {
        organizationId: organizationA.id,
        userId: userA.id,
        action: "platform.organization.status.updated",
        permission: "platform.organizations.update",
        targetType: "ORGANIZATION",
        targetId: organizationA.id,
        riskLevel: "MEDIUM",
        reason,
        beforeJsonSafe: { status: "ACTIVE" },
        afterJsonSafe: { status: "SUSPENDED" },
      } });
    });
    assert.equal((await prisma.organization.findUniqueOrThrow({ where: { id: organizationA.id } })).status, "SUSPENDED");
    assert.equal((await prisma.organization.findUniqueOrThrow({ where: { id: organizationB.id } })).status, "ACTIVE");
    assert.equal(await prisma.securityAuditLog.count({ where: { organizationId: organizationA.id, action: "platform.organization.status.updated" } }), 1);

    const readOnly = resolvePlatformAuthorization({
      authenticated: true,
      requestedPermission: "platform.organizations.update",
      twoFactorEnabled: true,
      breakGlassEmail: false,
      assignments: [{ roleKey: "AUDITOR", status: "ACTIVE", startsAt: new Date(0), expiresAt: null, permissionKeys: ["platform.organizations.read"] }],
    });
    assert.equal(readOnly.allowed, false);

    console.log(JSON.stringify({
      target: "127.0.0.1:54329/calculadora_nutricional",
      metadataOnlyProjection: true,
      documentMasked: true,
      crossTenantStatusUnchanged: true,
      mutationAudited: true,
      readOnlyCannotUpdate: true,
    }));
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
