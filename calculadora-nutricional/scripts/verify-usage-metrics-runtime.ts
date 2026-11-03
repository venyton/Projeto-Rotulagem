import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../src/lib/prisma";
import { USAGE_METRICS } from "../src/features/saas/domain/usage-metering";
import { recordServerUsage, UsageQuotaExceededError } from "../src/features/saas/services/usage-metering";
import { listTenantSaaSMetrics } from "../src/features/saas/services/saas-metrics";

const prefix = `stage10-${randomUUID()}`;
const email = `${prefix}@example.test`;

async function cleanup() {
  await prisma.organization.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.user.deleteMany({ where: { email } });
}

async function main() {
try {
  const feature = await prisma.featureDefinition.findUniqueOrThrow({ where: { key: USAGE_METRICS.AI_IMPORTS } });
  const user = await prisma.user.create({ data: { email, name: "Stage 10 Runtime" } });
  const [tenantA, tenantB] = await Promise.all([
    prisma.organization.create({ data: { ownerId: user.id, name: "Stage 10 Tenant A", slug: `${prefix}-a`, entitlementPolicyVersion: 2 } }),
    prisma.organization.create({ data: { ownerId: user.id, name: "Stage 10 Tenant B", slug: `${prefix}-b`, entitlementPolicyVersion: 2 } }),
  ]);
  await prisma.organizationFeatureGrant.createMany({ data: [
    { organizationId: tenantA.id, featureDefinitionId: feature.id, enabled: true, limitValue: 2, source: "STAGE10_RUNTIME", reason: "Verificação determinística de quota mensal" },
    { organizationId: tenantB.id, featureDefinitionId: feature.id, enabled: true, limitValue: 1, source: "STAGE10_RUNTIME", reason: "Verificação determinística de isolamento" },
  ] });

  const now = new Date();
  const consume = (organizationId: string, key: string, occurredAt = now) => recordServerUsage({
    organizationId,
    userId: user.id,
    metricKey: USAGE_METRICS.AI_IMPORTS,
    idempotencyKey: key,
    source: "runtime.stage10",
    occurredAt,
    enforceEntitlement: true,
  });

  const concurrent = await Promise.all([
    consume(tenantA.id, `${prefix}:a:1`),
    consume(tenantA.id, `${prefix}:a:2`),
  ]);
  assert.deepEqual(concurrent.map((item) => item.recorded).sort(), [true, true]);
  assert.equal(Math.max(...concurrent.map((item) => item.usage)), 2);

  await assert.rejects(() => consume(tenantA.id, `${prefix}:a:3`), UsageQuotaExceededError);
  const duplicate = await consume(tenantA.id, `${prefix}:a:1`);
  assert.equal(duplicate.recorded, false);
  assert.equal(duplicate.usage, 2);

  const isolated = await consume(tenantB.id, `${prefix}:b:1`);
  assert.equal(isolated.usage, 1);
  await assert.rejects(() => consume(tenantB.id, `${prefix}:b:2`), UsageQuotaExceededError);

  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 2));
  const reset = await consume(tenantA.id, `${prefix}:a:next-month`, nextMonth);
  assert.equal(reset.usage, 1);

  const dashboard = await listTenantSaaSMetrics(now);
  const rowA = dashboard.rows.find((row) => row.id === tenantA.id);
  assert.ok(rowA);
  assert.equal(rowA.usageTotal, 2);

  process.stdout.write(`${JSON.stringify({
    target: new URL(process.env.POSTGRES_PRISMA_URL || "").host,
    concurrentAccepted: concurrent.length,
    currentMonthUsageTenantA: rowA.usageTotal,
    currentMonthUsageTenantB: isolated.usage,
    duplicateCounted: duplicate.recorded,
    nextMonthUsageAfterReset: reset.usage,
    browserCountersAccepted: false,
  })}\n`);
} finally {
  await cleanup();
  await prisma.$disconnect();
}
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
});
