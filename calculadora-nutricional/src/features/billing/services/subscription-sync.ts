import { PaymentProvider, Prisma, SaaSModuleKey, SubscriptionStatus } from "@prisma/client";
import type Stripe from "stripe";

import { getSaaSPlan, getStripePriceEnvKey, type BillingInterval } from "@/features/saas/domain/plans";
import { MODULE_CATALOG, type SaaSModuleKey as AppModuleKey } from "@/features/saas/domain/modules";
import { prisma } from "@/lib/prisma";

type DbClient = typeof prisma | Prisma.TransactionClient;

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function fromUnix(value?: number | null) {
  return value ? new Date(value * 1000) : null;
}

export function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  const map: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
    trialing: SubscriptionStatus.TRIALING,
    active: SubscriptionStatus.ACTIVE,
    past_due: SubscriptionStatus.PAST_DUE,
    canceled: SubscriptionStatus.CANCELED,
    incomplete: SubscriptionStatus.INCOMPLETE,
    incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED,
    unpaid: SubscriptionStatus.UNPAID,
    paused: SubscriptionStatus.PAUSED,
  };

  return map[status] ?? SubscriptionStatus.INCOMPLETE;
}

export function getConfiguredStripePriceId(planCode: string, interval: BillingInterval, dbPlan?: {
  stripeMonthlyPriceId?: string | null;
  stripeQuarterlyPriceId?: string | null;
  stripeSemiannualPriceId?: string | null;
  stripeYearlyPriceId?: string | null;
}) {
  const fromDb = {
    month: dbPlan?.stripeMonthlyPriceId,
    quarter: dbPlan?.stripeQuarterlyPriceId,
    semester: dbPlan?.stripeSemiannualPriceId,
    year: dbPlan?.stripeYearlyPriceId,
  }[interval];
  if (fromDb) return fromDb;

  return process.env[getStripePriceEnvKey(planCode, interval)] || null;
}

export async function ensurePlan(client: DbClient, planCode: string) {
  const plan = getSaaSPlan(planCode);
  if (!plan) return null;

  const savedPlan = await client.plan.upsert({
    where: { code: plan.code },
    create: {
      code: plan.code,
      name: plan.name,
      description: plan.description,
      monthlyPriceCents: plan.monthlyPriceCents,
      quarterlyPriceCents: plan.quarterlyPriceCents,
      semiannualPriceCents: plan.semiannualPriceCents,
      yearlyPriceCents: plan.yearlyPriceCents,
      stripeMonthlyPriceId: process.env[getStripePriceEnvKey(plan.code, "month")] || null,
      stripeQuarterlyPriceId: process.env[getStripePriceEnvKey(plan.code, "quarter")] || null,
      stripeSemiannualPriceId: process.env[getStripePriceEnvKey(plan.code, "semester")] || null,
      stripeYearlyPriceId: process.env[getStripePriceEnvKey(plan.code, "year")] || null,
      modules: {
        create: plan.modules.map((moduleKey) => ({
          moduleKey: moduleKey as SaaSModuleKey,
          enabled: true,
        })),
      },
    },
    update: {
      name: plan.name,
      description: plan.description,
      monthlyPriceCents: plan.monthlyPriceCents,
      quarterlyPriceCents: plan.quarterlyPriceCents,
      semiannualPriceCents: plan.semiannualPriceCents,
      yearlyPriceCents: plan.yearlyPriceCents,
      stripeMonthlyPriceId: process.env[getStripePriceEnvKey(plan.code, "month")] || undefined,
      stripeQuarterlyPriceId: process.env[getStripePriceEnvKey(plan.code, "quarter")] || undefined,
      stripeSemiannualPriceId: process.env[getStripePriceEnvKey(plan.code, "semester")] || undefined,
      stripeYearlyPriceId: process.env[getStripePriceEnvKey(plan.code, "year")] || undefined,
      active: true,
    },
  });

  for (const moduleKey of plan.modules) {
    await client.planModule.upsert({
      where: {
        planId_moduleKey: {
          planId: savedPlan.id,
          moduleKey: moduleKey as SaaSModuleKey,
        },
      },
      create: {
        planId: savedPlan.id,
        moduleKey: moduleKey as SaaSModuleKey,
        enabled: true,
      },
      update: { enabled: true },
    });
  }

  await client.planModule.updateMany({
    where: {
      planId: savedPlan.id,
      moduleKey: { notIn: plan.modules as SaaSModuleKey[] },
    },
    data: { enabled: false },
  });

  return savedPlan;
}

export async function applyPlanEntitlements(client: DbClient, organizationId: string, modules: AppModuleKey[], source: string) {
  const enabledModules = new Set(modules);

  for (const moduleDefinition of MODULE_CATALOG) {
    const moduleKey = moduleDefinition.key;
    const enabled = enabledModules.has(moduleKey);

    await client.organizationEntitlement.upsert({
      where: {
        organizationId_moduleKey: {
          organizationId,
          moduleKey: moduleKey as SaaSModuleKey,
        },
      },
      create: {
        organizationId,
        moduleKey: moduleKey as SaaSModuleKey,
        enabled,
        source,
      },
      update: {
        enabled,
        source,
        expiresAt: enabled ? null : new Date(),
      },
    });
  }
}

export async function syncStripeSubscription(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata.organizationId;
  if (!organizationId) {
    throw new Error("Assinatura sem organizationId no metadata.");
  }

  const item = subscription.items.data[0];
  const providerPriceId = item?.price?.id || null;
  const currentPeriodStart = fromUnix(item?.current_period_start);
  const currentPeriodEnd = fromUnix(item?.current_period_end);
  const planCode = subscription.metadata.planCode || await findPlanCodeByPrice(providerPriceId);

  await prisma.$transaction(async (tx) => {
    const savedPlan = planCode ? await tx.plan.findUnique({
      where: { code: planCode },
      include: { modules: { where: { enabled: true } } },
    }) : null;
    const planConfig = planCode && !savedPlan ? getSaaSPlan(planCode) : null;
    const plan = savedPlan ?? (planConfig ? await ensurePlan(tx, planConfig.code) : null);
    const planModules = savedPlan
      ? savedPlan.modules.map((module) => module.moduleKey as AppModuleKey)
      : planConfig?.modules ?? [];

    await tx.subscription.upsert({
      where: { providerSubscriptionId: subscription.id },
      create: {
        organizationId,
        planId: plan?.id ?? null,
        provider: PaymentProvider.STRIPE,
        providerSubscriptionId: subscription.id,
        providerPriceId,
        status: mapStripeSubscriptionStatus(subscription.status),
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialEndsAt: fromUnix(subscription.trial_end),
        metadata: toJson(subscription.metadata),
      },
      update: {
        planId: plan?.id ?? undefined,
        providerPriceId,
        status: mapStripeSubscriptionStatus(subscription.status),
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialEndsAt: fromUnix(subscription.trial_end),
        metadata: toJson(subscription.metadata),
      },
    });

    if (plan) {
      const activeModules = ["active", "trialing"].includes(subscription.status) ? planModules : [];
      await applyPlanEntitlements(tx, organizationId, activeModules, "STRIPE");
    }
  });
}

async function findPlanCodeByPrice(priceId: string | null) {
  if (!priceId) return null;

  const plan = await prisma.plan.findFirst({
    where: {
      OR: [
        { stripeMonthlyPriceId: priceId },
        { stripeQuarterlyPriceId: priceId },
        { stripeSemiannualPriceId: priceId },
        { stripeYearlyPriceId: priceId },
      ],
    },
    select: { code: true },
  });

  if (plan) return plan.code;

  for (const planDefinition of ["starter", "professional", "enterprise"]) {
    for (const interval of ["month", "quarter", "semester", "year"] as const) {
      if (process.env[getStripePriceEnvKey(planDefinition, interval)] === priceId) {
        return planDefinition;
      }
    }
  }

  return null;
}
