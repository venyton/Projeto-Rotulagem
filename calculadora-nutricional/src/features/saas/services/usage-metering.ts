import "server-only";

import type { Prisma } from "@prisma/client";

import { evaluateEntitlementLimit } from "@/features/saas/domain/limit-enforcement";
import { monthlyUsagePeriod, validateUsageRecord } from "@/features/saas/domain/usage-metering";
import { resolveOrganizationFeatureEntitlementsWithClient } from "@/features/saas/services/feature-entitlements";
import { prisma } from "@/lib/prisma";

export class UsageQuotaExceededError extends Error {
  constructor(public readonly limit: number, public readonly usage: number) {
    super("Limite mensal desta funcionalidade atingido.");
    this.name = "UsageQuotaExceededError";
  }
}

export async function recordServerUsage(input: {
  organizationId: string;
  userId?: string | null;
  metricKey: string;
  idempotencyKey: string;
  source: string;
  quantity?: number;
  costMinor?: number;
  occurredAt?: Date;
  enforceEntitlement?: boolean;
}) {
  const normalized = validateUsageRecord({
    metricKey: input.metricKey,
    idempotencyKey: input.idempotencyKey,
    source: input.source,
    quantity: input.quantity ?? 1,
    costMinor: input.costMinor ?? 0,
  });
  const occurredAt = input.occurredAt ?? new Date();
  const period = monthlyUsagePeriod(occurredAt);

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${input.organizationId}:${normalized.metricKey}:${period.start.toISOString()}`}, 0))`;
    const previous = await tx.usageEvent.findUnique({
      where: { organizationId_idempotencyKey: { organizationId: input.organizationId, idempotencyKey: normalized.idempotencyKey } },
      select: { id: true },
    });
    const aggregate = await tx.usageAggregate.findUnique({
      where: { organizationId_metricKey_periodStart: { organizationId: input.organizationId, metricKey: normalized.metricKey, periodStart: period.start } },
      select: { quantity: true, costMinor: true },
    });
    if (previous) return { recorded: false, usage: aggregate?.quantity ?? 0, period };

    if (input.enforceEntitlement) {
      const entitlements = await resolveOrganizationFeatureEntitlementsWithClient(tx, input.organizationId);
      const entitlement = entitlements?.find((item) => item.featureKey === normalized.metricKey);
      const decision = evaluateEntitlementLimit({
        enabled: entitlement?.enabled ?? false,
        limit: entitlement?.limit ?? null,
        usage: aggregate?.quantity ?? 0,
        requested: normalized.quantity,
      });
      if (!decision.allowed) {
        if (decision.reason === "limit_exceeded" && decision.limit !== null) {
          throw new UsageQuotaExceededError(decision.limit, decision.usage);
        }
        throw new Error("Feature de consumo não liberada para esta organização.");
      }
    }

    await tx.usageEvent.create({ data: {
      organizationId: input.organizationId,
      userId: input.userId ?? null,
      metricKey: normalized.metricKey,
      idempotencyKey: normalized.idempotencyKey,
      source: normalized.source,
      quantity: normalized.quantity,
      costMinor: normalized.costMinor,
      occurredAt,
      periodStart: period.start,
      periodEnd: period.end,
    } });
    const updated = await tx.usageAggregate.upsert({
      where: { organizationId_metricKey_periodStart: { organizationId: input.organizationId, metricKey: normalized.metricKey, periodStart: period.start } },
      create: {
        organizationId: input.organizationId,
        metricKey: normalized.metricKey,
        periodStart: period.start,
        periodEnd: period.end,
        quantity: normalized.quantity,
        costMinor: normalized.costMinor,
      },
      update: { quantity: { increment: normalized.quantity }, costMinor: { increment: normalized.costMinor }, periodEnd: period.end },
      select: { quantity: true, costMinor: true },
    });
    return { recorded: true, usage: updated.quantity, period };
  }, { isolationLevel: "ReadCommitted", maxWait: 5_000, timeout: 10_000 });
}

export type UsageTransactionClient = Prisma.TransactionClient;
