import "server-only";

import { Prisma, type BillingInterval } from "@prisma/client";

import { monthlyUsagePeriod } from "@/features/saas/domain/usage-metering";
import { prisma } from "@/lib/prisma";

function monthlyAmount(amountMinor: number, interval: BillingInterval) {
  const divisor = interval === "MONTHLY" ? 1 : interval === "QUARTERLY" ? 3 : interval === "SEMIANNUAL" ? 6 : 12;
  return Math.round(amountMinor / divisor);
}

export async function getGlobalSaaSMetrics(at = new Date()) {
  const period = monthlyUsagePeriod(at);
  const activitySince = new Date(at.getTime() - 30 * 24 * 60 * 60 * 1_000);
  const stalledBefore = new Date(at.getTime() - 5 * 60 * 1_000);
  const [activeOrganizations, totalOrganizations, trials, pastDue, canceledRecently, subscriptions, failedWebhooks, stalledWebhooks, reconciliationRequired, incidents, usage] = await Promise.all([
    prisma.organization.count({ where: { status: "ACTIVE" } }),
    prisma.organization.count(),
    prisma.subscription.count({ where: { status: "TRIALING", OR: [{ trialEndsAt: null }, { trialEndsAt: { gt: at } }] } }),
    prisma.subscription.count({ where: { status: { in: ["PAST_DUE", "UNPAID"] } } }),
    prisma.subscription.count({ where: { status: "CANCELED", updatedAt: { gte: activitySince } } }),
    prisma.subscription.findMany({
      where: { status: "ACTIVE", billingPriceId: { not: null } },
      select: {
        billingPrice: { select: { amountMinor: true, billingInterval: true } },
        couponRedemption: { select: { finalAmountMinor: true, revokedAt: true } },
      },
    }),
    prisma.billingWebhookEvent.count({ where: { status: "FAILED" } }),
    prisma.billingWebhookEvent.count({
      where: { status: { in: ["RECEIVED", "PROCESSING"] }, updatedAt: { lt: stalledBefore } },
    }),
    prisma.billingCheckoutAttempt.count({ where: { status: "OUTCOME_UNKNOWN" } }),
    prisma.securityAuditLog.count({ where: { riskLevel: { in: ["HIGH", "CRITICAL"] }, createdAt: { gte: activitySince } } }),
    prisma.usageAggregate.groupBy({
      by: ["metricKey"],
      where: { periodStart: period.start },
      _sum: { quantity: true, costMinor: true },
      orderBy: { _sum: { quantity: "desc" } },
    }),
  ]);
  const reconciledMrrMinor = subscriptions.reduce((total, subscription) => {
    if (!subscription.billingPrice) return total;
    const amount = subscription.couponRedemption && !subscription.couponRedemption.revokedAt
      ? subscription.couponRedemption.finalAmountMinor
      : subscription.billingPrice.amountMinor;
    return total + monthlyAmount(amount, subscription.billingPrice.billingInterval);
  }, 0);
  const observedConversionPercent = totalOrganizations === 0 ? 0 : Math.round((subscriptions.length / totalOrganizations) * 10_000) / 100;
  const churnDenominator = subscriptions.length + canceledRecently;
  const observedChurnPercent = churnDenominator === 0 ? 0 : Math.round((canceledRecently / churnDenominator) * 10_000) / 100;
  const operationalAlerts = [
    ...(failedWebhooks > 0 ? [{ code: "FAILED_WEBHOOKS", severity: "critical" as const, count: failedWebhooks, message: "Webhooks falharam e exigem reprocessamento ou reconciliação." }] : []),
    ...(stalledWebhooks > 0 ? [{ code: "STALLED_WEBHOOKS", severity: "critical" as const, count: stalledWebhooks, message: "Eventos permanecem recebidos ou em processamento há mais de cinco minutos." }] : []),
    ...(reconciliationRequired > 0 ? [{ code: "CHECKOUT_RECONCILIATION_REQUIRED", severity: "warning" as const, count: reconciliationRequired, message: "Checkouts têm resultado externo incerto e aguardam reconciliação." }] : []),
    ...(pastDue > 0 ? [{ code: "PAST_DUE_SUBSCRIPTIONS", severity: "warning" as const, count: pastDue, message: "Assinaturas vencidas ou não pagas precisam de acompanhamento." }] : []),
  ];

  return {
    period,
    activeOrganizations,
    totalOrganizations,
    trials,
    activeSubscriptions: subscriptions.length,
    pastDue,
    canceledRecently,
    observedConversionPercent,
    observedChurnPercent,
    reconciledMrrMinor,
    reconciledArrMinor: reconciledMrrMinor * 12,
    failedWebhooks,
    stalledWebhooks,
    reconciliationRequired,
    incidents,
    operationalAlerts,
    usage: usage.map((item) => ({ metricKey: item.metricKey, quantity: item._sum.quantity ?? 0, costMinor: item._sum.costMinor ?? 0 })),
  };
}

type TenantMetricRow = {
  id: string;
  name: string;
  status: string;
  planName: string | null;
  planVersion: number | null;
  subscriptionStatus: string | null;
  seats: number;
  activeUsers30d: number;
  tables: number;
  ingredients: number;
  aiExtractions: number;
  exports: number;
  enterpriseProjects: number;
  apiRequests: number;
  usageTotal: number;
  usageCostMinor: number;
  failures30d: number;
  lastActivityAt: Date | null;
};

export async function listTenantSaaSMetrics(at = new Date()) {
  const period = monthlyUsagePeriod(at);
  const activitySince = new Date(at.getTime() - 30 * 24 * 60 * 60 * 1_000);
  const rows = await prisma.$queryRaw<TenantMetricRow[]>(Prisma.sql`
    SELECT
      o."id",
      o."name",
      o."status"::text AS "status",
      plan."planName",
      plan."planVersion",
      plan."subscriptionStatus",
      (SELECT count(*)::int FROM "OrganizationMember" m WHERE m."organizationId" = o."id" AND m."active" = true)
        + (SELECT count(*)::int FROM "OrganizationInvitation" i WHERE i."organizationId" = o."id" AND i."status" = 'PENDING') AS "seats",
      (SELECT count(DISTINCT me."userId")::int FROM "MarketingEvent" me WHERE me."organizationId" = o."id" AND me."eventType" = 'LOGIN' AND me."occurredAt" >= ${activitySince}) AS "activeUsers30d",
      (SELECT count(*)::int FROM "GeneratedTable" t WHERE t."organizationId" = o."id") AS "tables",
      (SELECT count(*)::int FROM "CustomIngredient" i WHERE i."organizationId" = o."id") AS "ingredients",
      (SELECT count(*)::int FROM "TechnicalSheetExtraction" e WHERE e."organizationId" = o."id" AND e."createdAt" >= ${period.start} AND e."createdAt" < ${period.end}) AS "aiExtractions",
      (SELECT count(*)::int FROM "EnterpriseExport" ee JOIN "EnterpriseLabelProject" ep ON ep."id" = ee."projectId" WHERE ep."organizationId" = o."id" AND ee."createdAt" >= ${period.start} AND ee."createdAt" < ${period.end}) AS "exports",
      (SELECT count(*)::int FROM "EnterpriseLabelProject" ep WHERE ep."organizationId" = o."id") AS "enterpriseProjects",
      COALESCE((SELECT ua."quantity" FROM "UsageAggregate" ua WHERE ua."organizationId" = o."id" AND ua."metricKey" = 'api_requests' AND ua."periodStart" = ${period.start}), 0)::int AS "apiRequests",
      COALESCE((SELECT sum(ua."quantity") FROM "UsageAggregate" ua WHERE ua."organizationId" = o."id" AND ua."periodStart" = ${period.start}), 0)::int AS "usageTotal",
      COALESCE((SELECT sum(ua."costMinor") FROM "UsageAggregate" ua WHERE ua."organizationId" = o."id" AND ua."periodStart" = ${period.start}), 0)::int AS "usageCostMinor",
      ((SELECT count(*) FROM "BillingWebhookEvent" w WHERE w."organizationId" = o."id" AND w."status" = 'FAILED' AND w."createdAt" >= ${activitySince})
        + (SELECT count(*) FROM "SecurityAuditLog" a WHERE a."organizationId" = o."id" AND a."result" = 'DENIED' AND a."createdAt" >= ${activitySince}))::int AS "failures30d",
      (SELECT max(a."createdAt") FROM "SecurityAuditLog" a WHERE a."organizationId" = o."id") AS "lastActivityAt"
    FROM "Organization" o
    LEFT JOIN LATERAL (
      SELECT p."name" AS "planName", pv."versionNumber" AS "planVersion", s."status"::text AS "subscriptionStatus"
      FROM "Subscription" s
      LEFT JOIN "PlanVersion" pv ON pv."id" = s."planVersionId"
      LEFT JOIN "Plan" p ON p."id" = pv."planId"
      WHERE s."organizationId" = o."id"
      ORDER BY s."updatedAt" DESC
      LIMIT 1
    ) plan ON true
    ORDER BY "usageTotal" DESC, o."updatedAt" DESC, o."id" ASC
    LIMIT 25
  `);
  return { period, rows };
}
