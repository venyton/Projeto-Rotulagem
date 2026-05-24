import { Prisma, SaaSModuleKey } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { SAAS_PLANS, type SaaSPlanDefinition } from "@/features/saas/domain/plans";
import type { SaaSModuleKey as AppModuleKey } from "@/features/saas/domain/modules";

const planWithModules = Prisma.validator<Prisma.PlanDefaultArgs>()({
  include: {
    modules: {
      where: { enabled: true },
      orderBy: { createdAt: "asc" },
    },
  },
});

type DbPlanWithModules = Prisma.PlanGetPayload<typeof planWithModules>;

export type BillingPlan = SaaSPlanDefinition & {
  id?: string;
  active: boolean;
  stripeMonthlyPriceId?: string | null;
  stripeQuarterlyPriceId?: string | null;
  stripeSemiannualPriceId?: string | null;
  stripeYearlyPriceId?: string | null;
};

function fromDomainPlan(plan: SaaSPlanDefinition): BillingPlan {
  return {
    ...plan,
    active: true,
  };
}

function fromDbPlan(plan: DbPlanWithModules): BillingPlan {
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description ?? "",
    monthlyPriceCents: plan.monthlyPriceCents,
    quarterlyPriceCents: plan.quarterlyPriceCents,
    semiannualPriceCents: plan.semiannualPriceCents,
    yearlyPriceCents: plan.yearlyPriceCents,
    active: plan.active,
    stripeMonthlyPriceId: plan.stripeMonthlyPriceId,
    stripeQuarterlyPriceId: plan.stripeQuarterlyPriceId,
    stripeSemiannualPriceId: plan.stripeSemiannualPriceId,
    stripeYearlyPriceId: plan.stripeYearlyPriceId,
    modules: plan.modules.map((module) => module.moduleKey as AppModuleKey),
  };
}

export async function getActiveBillingPlans() {
  try {
    const plans = await prisma.plan.findMany({
      where: { active: true },
      include: planWithModules.include,
      orderBy: [
        { monthlyPriceCents: "asc" },
        { name: "asc" },
      ],
    });

    if (plans.length > 0) return plans.map(fromDbPlan);
  } catch {
    return SAAS_PLANS.map(fromDomainPlan);
  }

  return SAAS_PLANS.map(fromDomainPlan);
}

export async function getBillingPlanForCheckout(planCode: string) {
  const dbPlan = await prisma.plan.findFirst({
    where: { code: planCode, active: true },
    include: planWithModules.include,
  });

  if (dbPlan) return fromDbPlan(dbPlan);

  const fallback = SAAS_PLANS.find((plan) => plan.code === planCode);
  return fallback ? fromDomainPlan(fallback) : null;
}

export function toPrismaModuleKey(moduleKey: AppModuleKey) {
  return moduleKey as SaaSModuleKey;
}
