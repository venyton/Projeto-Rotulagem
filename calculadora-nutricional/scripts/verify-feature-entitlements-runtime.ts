import assert from "node:assert/strict";

import { Prisma, PrismaClient } from "@prisma/client";

import { resolveFeatureEntitlement } from "../src/features/saas/domain/feature-entitlement";
import { countBillableSeats, evaluateEntitlementLimit } from "../src/features/saas/domain/limit-enforcement";

const databaseUrl = process.env.POSTGRES_PRISMA_URL ?? "";
const parsedUrl = new URL(databaseUrl);
if (!(["127.0.0.1", "localhost"].includes(parsedUrl.hostname) && parsedUrl.port === "54329")) {
  throw new Error("Smoke de entitlement recusado: POSTGRES_PRISMA_URL deve apontar para 127.0.0.1:54329.");
}

const prisma = new PrismaClient();
const userId = "stage4-runtime-user";
const organizationId = "stage4-runtime-organization";
const planId = "stage4-runtime-plan";
const planVersionId = "stage4-runtime-plan-version";
const nextPlanVersionId = "stage4-runtime-plan-version-2";
const concurrentUserIds = ["stage4-runtime-seat-a", "stage4-runtime-seat-b"];

async function cleanup() {
  await prisma.$transaction(async (tx) => {
    await tx.securityAuditLog.deleteMany({ where: { userId } });
    await tx.organizationFeatureOverride.deleteMany({ where: { organizationId } });
    await tx.organizationFeatureGrant.deleteMany({ where: { organizationId } });
    await tx.subscription.deleteMany({ where: { organizationId } });
    await tx.organizationMember.deleteMany({ where: { organizationId } });
    await tx.organizationEntitlement.deleteMany({ where: { organizationId } });
    await tx.organization.deleteMany({ where: { id: organizationId } });

    const plan = await tx.plan.findUnique({ where: { id: planId }, select: { id: true } });
    if (plan) {
      await tx.$executeRawUnsafe('ALTER TABLE "BillingPrice" DISABLE TRIGGER USER');
      await tx.$executeRawUnsafe('ALTER TABLE "PlanVersionFeature" DISABLE TRIGGER USER');
      await tx.$executeRawUnsafe('ALTER TABLE "PlanVersion" DISABLE TRIGGER USER');
      await tx.billingPrice.deleteMany({ where: { planVersion: { planId } } });
      await tx.planVersionFeature.deleteMany({ where: { planVersion: { planId } } });
      await tx.planVersion.deleteMany({ where: { planId } });
      await tx.plan.deleteMany({ where: { id: planId } });
      await tx.$executeRawUnsafe('ALTER TABLE "BillingPrice" ENABLE TRIGGER USER');
      await tx.$executeRawUnsafe('ALTER TABLE "PlanVersionFeature" ENABLE TRIGGER USER');
      await tx.$executeRawUnsafe('ALTER TABLE "PlanVersion" ENABLE TRIGGER USER');
    }
    await tx.user.deleteMany({ where: { id: { in: [userId, ...concurrentUserIds] } } });
  });
}

type EntitlementDatabase = Prisma.TransactionClient | PrismaClient;

async function resolvePersistedFeature(
  featureKey: string,
  database: EntitlementDatabase = prisma,
) {
  const at = new Date();
  const feature = await database.featureDefinition.findUniqueOrThrow({ where: { key: featureKey } });
  const organization = await database.organization.findUniqueOrThrow({
    where: { id: organizationId },
    include: {
      entitlements: true,
      featureGrants: { where: { featureDefinitionId: feature.id } },
      featureOverrides: { where: { featureDefinitionId: feature.id } },
      subscriptions: {
        where: { status: { in: ["ACTIVE", "TRIALING"] }, planVersionId: { not: null } },
        orderBy: { updatedAt: "desc" },
        include: {
          planVersion: {
            include: { features: { where: { featureDefinitionId: feature.id } } },
          },
        },
      },
    },
  });
  const subscription = organization.subscriptions.find((candidate) =>
    candidate.planVersion?.status === "PUBLISHED"
      && (candidate.status !== "TRIALING"
        || candidate.trialEndsAt === null
        || candidate.trialEndsAt.getTime() > at.getTime()),
  ) ?? null;
  const planFeature = subscription?.planVersion?.features[0] ?? null;

  return resolveFeatureEntitlement({
    featureKey: feature.key,
    featureType: feature.type,
    moduleKey: feature.moduleKey,
    organizationStatus: organization.status,
    policyVersion: organization.entitlementPolicyVersion,
    at,
    overrides: organization.featureOverrides,
    grants: organization.featureGrants,
    planFeature: planFeature
      ? {
          enabled: planFeature.enabled,
          limitValue: planFeature.limitValue,
          validUntil: subscription?.status === "TRIALING"
            ? subscription.trialEndsAt
            : subscription?.currentPeriodEnd ?? null,
        }
      : null,
    legacyModules: organization.entitlements,
  });
}

async function reserveSeat(userIdToLink: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'soizi:seats:' + organizationId}))::text AS lock`;
    const [seatEntitlement, activeMemberships, pendingInvitations] = await Promise.all([
      resolvePersistedFeature("seats_max", tx),
      tx.organizationMember.count({ where: { organizationId, active: true } }),
      tx.organizationInvitation.count({
        where: { organizationId, status: "PENDING", expiresAt: { gt: new Date() } },
      }),
    ]);
    const usage = countBillableSeats({ activeMemberships, pendingInvitations });
    const decision = evaluateEntitlementLimit({
      enabled: seatEntitlement.enabled,
      limit: seatEntitlement.limit,
      usage,
    });
    if (!decision.allowed) return { result: "denied" as const, decision };

    await tx.organizationMember.create({
      data: {
        organizationId,
        userId: userIdToLink,
        role: "MEMBER",
        active: true,
      },
    });
    return { result: "created" as const, decision };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}

async function main() {
try {
  await cleanup();
  const [tablesFeature, apiFeature, seatsFeature] = await Promise.all([
    prisma.featureDefinition.findUniqueOrThrow({ where: { key: "tables" } }),
    prisma.featureDefinition.findUniqueOrThrow({ where: { key: "api_access" } }),
    prisma.featureDefinition.findUniqueOrThrow({ where: { key: "seats_max" } }),
  ]);

  await prisma.user.create({ data: { id: userId, email: "stage4-runtime@example.test", name: "Stage 4 Runtime" } });
  await prisma.organization.create({
    data: {
      id: organizationId,
      ownerId: userId,
      name: "Stage 4 Runtime",
      slug: "stage4-runtime",
      entitlementPolicyVersion: 2,
      members: { create: { userId, role: "OWNER" } },
    },
  });

  const defaultDenied = await resolvePersistedFeature("tables");
  assert.equal(defaultDenied.source, "DEFAULT_DENY");
  assert.equal(defaultDenied.enabled, false);

  await prisma.organization.update({ where: { id: organizationId }, data: { entitlementPolicyVersion: 1 } });
  const legacyAllowed = await resolvePersistedFeature("tables");
  assert.equal(legacyAllowed.source, "LEGACY_POLICY_V1");
  await prisma.organization.update({ where: { id: organizationId }, data: { entitlementPolicyVersion: 2 } });

  await prisma.organizationFeatureGrant.create({
    data: {
      id: "stage4-runtime-grant",
      organizationId,
      featureDefinitionId: apiFeature.id,
      source: "RUNTIME_TEST",
      reason: "Smoke local descartável",
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
  const granted = await resolvePersistedFeature("api_access");
  assert.equal(granted.source, "GRANT");
  assert.equal(granted.enabled, true);

  await prisma.plan.create({
    data: {
      id: planId,
      code: "stage4_runtime",
      name: "Stage 4 Runtime",
      active: true,
      status: "ACTIVE",
      isPaid: false,
      versions: {
        create: {
          id: planVersionId,
          versionNumber: 1,
          status: "DRAFT",
          features: {
            create: [
              { featureDefinitionId: tablesFeature.id, enabled: true },
              { featureDefinitionId: seatsFeature.id, enabled: true, limitValue: 2 },
            ],
          },
        },
      },
    },
  });
  await prisma.planVersion.update({
    where: { id: planVersionId },
    data: { status: "PUBLISHED", publishedAt: new Date(), validFrom: new Date() },
  });
  await prisma.subscription.create({
    data: {
      id: "stage4-runtime-subscription",
      organizationId,
      planId,
      planVersionId,
      provider: "MANUAL",
      status: "ACTIVE",
    },
  });
  const fromPlan = await resolvePersistedFeature("tables");
  assert.equal(fromPlan.source, "PLAN_VERSION");
  assert.equal(fromPlan.enabled, true);

  await prisma.planVersion.create({
    data: {
      id: nextPlanVersionId,
      planId,
      versionNumber: 2,
      status: "DRAFT",
      features: {
        create: [
          { featureDefinitionId: tablesFeature.id, enabled: false },
          { featureDefinitionId: seatsFeature.id, enabled: true, limitValue: 3 },
        ],
      },
    },
  });
  await prisma.planVersion.update({
    where: { id: nextPlanVersionId },
    data: { status: "PUBLISHED", publishedAt: new Date(), validFrom: new Date() },
  });
  const grandfathered = await resolvePersistedFeature("tables");
  assert.equal(grandfathered.source, "PLAN_VERSION");
  assert.equal(grandfathered.enabled, true);

  await prisma.user.createMany({
    data: concurrentUserIds.map((id, index) => ({
      id,
      email: `stage4-runtime-seat-${index + 1}@example.test`,
      name: `Stage 4 Seat ${index + 1}`,
    })),
  });
  const concurrentSeats = await Promise.all(concurrentUserIds.map(reserveSeat));
  assert.deepEqual(
    concurrentSeats.map((result) => result.result).sort(),
    ["created", "denied"],
  );
  const finalActiveSeats = await prisma.organizationMember.count({
    where: { organizationId, active: true },
  });
  assert.equal(finalActiveSeats, 2);

  await prisma.organizationFeatureOverride.create({
    data: {
      id: "stage4-runtime-override",
      organizationId,
      featureDefinitionId: tablesFeature.id,
      mode: "DISABLE",
      reason: "Smoke local descartável",
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
  const overridden = await resolvePersistedFeature("tables");
  assert.equal(overridden.source, "OVERRIDE");
  assert.equal(overridden.enabled, false);

  console.log(JSON.stringify({
    target: "127.0.0.1:54329/calculadora_nutricional",
    defaultDenied: defaultDenied.source,
    legacyCompatibility: legacyAllowed.source,
    grant: granted.source,
    plan: fromPlan.source,
    grandfatheredAfterVersion2: grandfathered.enabled,
    concurrentSeats: concurrentSeats.map((result) => result.result).sort(),
    finalActiveSeats,
    override: overridden.reasonCode,
  }));
} finally {
  await cleanup();
  await prisma.$disconnect();
}
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
