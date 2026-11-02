import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { generate, generateSecret } from "otplib";

import { decryptTotpSecret, encryptTotpSecret } from "../src/lib/security/totp";

const EMAIL = "stage11-browser@example.test";
const MEMBER_EMAIL = "stage12-member@example.test";
const databaseUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("URL local obrigatória.");
const target = new URL(databaseUrl);
if (!(["127.0.0.1", "localhost"].includes(target.hostname) && target.port === "54329")) {
  throw new Error(`Fixture recusou alvo não local: ${target.hostname}:${target.port}`);
}

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

async function cleanup() {
  const users = await prisma.user.findMany({ where: { email: { in: [EMAIL, MEMBER_EMAIL] } }, select: { id: true } });
  if (users.length === 0) return;
  const userIds = users.map((user) => user.id);
  const owner = await prisma.user.findUnique({ where: { email: EMAIL }, select: { id: true } });
  await prisma.securityAuditLog.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.privilegedSession.deleteMany({
    where: { OR: [{ requestedByUserId: { in: userIds } }, { approvedByUserId: { in: userIds } }] },
  });
  await prisma.platformAdminAssignment.deleteMany({
    where: { OR: [{ userId: { in: userIds } }, { assignedByUserId: { in: userIds } }] },
  });
  if (owner) await prisma.organization.deleteMany({ where: { ownerId: owner.id } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

async function prepare() {
  const password = process.env.STAGE11_BROWSER_PASSWORD;
  if (!password || password.length < 16) throw new Error("STAGE11_BROWSER_PASSWORD local com 16+ caracteres é obrigatória.");
  await cleanup();
  const secret = generateSecret({ length: 20 });
  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      name: "Operador Stage 11",
      password: await hash(password, 10),
      twoFactorEnabled: true,
      twoFactorSecret: encryptTotpSecret(secret),
      twoFactorConfirmedAt: new Date(),
      termsAcceptedAt: new Date(),
      privacyAcceptedAt: new Date(),
      legalDocumentVersion: "2026-05-01",
    },
  });
  const member = await prisma.user.create({
    data: {
      email: MEMBER_EMAIL,
      name: "Membro Stage 12",
      password: await hash(password, 10),
      termsAcceptedAt: new Date(),
      privacyAcceptedAt: new Date(),
      legalDocumentVersion: "2026-05-01",
    },
  });
  const role = await prisma.platformRole.findUniqueOrThrow({ where: { key: "PLATFORM_OWNER" } });
  await prisma.platformAdminAssignment.create({
    data: { userId: user.id, platformRoleId: role.id, assignedByUserId: user.id },
  });
  const organization = await prisma.organization.create({
    data: {
      ownerId: user.id,
      name: "Organização Stage 11",
      slug: `stage11-browser-${user.id}`,
    },
  });
  await prisma.organizationMember.createMany({ data: [
    { organizationId: organization.id, userId: user.id, role: "OWNER" },
    { organizationId: organization.id, userId: member.id, role: "MEMBER" },
  ] });
  await prisma.organizationEntitlement.createMany({ data: [
    { organizationId: organization.id, moduleKey: "TABLES", enabled: true, source: "STAGE12_E2E" },
    { organizationId: organization.id, moduleKey: "SETTINGS", enabled: true, source: "STAGE12_E2E" },
  ] });
  const code = await generate({ secret, digits: 6, period: 30 });
  console.log(JSON.stringify({ target: `${target.hostname}:${target.port}`, email: EMAIL, memberEmail: MEMBER_EMAIL, userId: user.id, memberId: member.id, organizationId: organization.id, code }));
}

async function code() {
  const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL }, select: { twoFactorSecret: true } });
  if (!user.twoFactorSecret) throw new Error("Fixture sem segredo TOTP.");
  const current = await generate({ secret: decryptTotpSecret(user.twoFactorSecret), digits: 6, period: 30 });
  console.log(JSON.stringify({ code: current, generatedAt: new Date().toISOString() }));
}

async function main() {
  const command = process.argv[2];
  if (command === "prepare") await prepare();
  else if (command === "code") await code();
  else if (command === "cleanup") {
    await cleanup();
    console.log(JSON.stringify({ cleaned: true, target: `${target.hostname}:${target.port}` }));
  } else throw new Error("Use prepare, code ou cleanup.");
}

main().finally(() => prisma.$disconnect());
