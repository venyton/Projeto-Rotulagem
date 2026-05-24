import { SAAS_MODULES, type SaaSModuleKey } from "@/features/saas/domain/modules";

export type BillingInterval = "month" | "quarter" | "semester" | "year";

export const BILLING_INTERVALS: Array<{
  value: BillingInterval;
  label: string;
  shortLabel: string;
  periodLabel: string;
}> = [
  { value: "month", label: "Mensal", shortLabel: "mês", periodLabel: "por mês" },
  { value: "quarter", label: "Trimestral", shortLabel: "tri", periodLabel: "por trimestre" },
  { value: "semester", label: "Semestral", shortLabel: "sem", periodLabel: "por semestre" },
  { value: "year", label: "Anual", shortLabel: "ano", periodLabel: "por ano" },
];

export type SaaSPlanDefinition = {
  code: string;
  name: string;
  description: string;
  monthlyPriceCents: number;
  quarterlyPriceCents: number;
  semiannualPriceCents: number;
  yearlyPriceCents: number;
  modules: SaaSModuleKey[];
};

export const SAAS_PLANS: SaaSPlanDefinition[] = [
  {
    code: "starter",
    name: "Starter",
    description: "Base segura para começar a criar tabelas e exportar.",
    monthlyPriceCents: 9900,
    quarterlyPriceCents: 27900,
    semiannualPriceCents: 53900,
    yearlyPriceCents: 99900,
    modules: [
      SAAS_MODULES.TABLES,
      SAAS_MODULES.CUSTOM_INGREDIENTS,
      SAAS_MODULES.EXPORTS,
    ],
  },
  {
    code: "professional",
    name: "Professional",
    description: "Recursos de crescimento com IA, bases externas e fichas técnicas.",
    monthlyPriceCents: 19900,
    quarterlyPriceCents: 56700,
    semiannualPriceCents: 107500,
    yearlyPriceCents: 199000,
    modules: [
      SAAS_MODULES.TABLES,
      SAAS_MODULES.CUSTOM_INGREDIENTS,
      SAAS_MODULES.EXPORTS,
      SAAS_MODULES.TECHNICAL_SHEETS,
      SAAS_MODULES.AI_IMPORT,
      SAAS_MODULES.OPEN_FOOD_FACTS,
    ],
  },
  {
    code: "enterprise",
    name: "Enterprise",
    description: "Operação completa para times, rótulos internacionais e API.",
    monthlyPriceCents: 49900,
    quarterlyPriceCents: 142200,
    semiannualPriceCents: 269400,
    yearlyPriceCents: 499000,
    modules: [
      SAAS_MODULES.TABLES,
      SAAS_MODULES.CUSTOM_INGREDIENTS,
      SAAS_MODULES.EXPORTS,
      SAAS_MODULES.TECHNICAL_SHEETS,
      SAAS_MODULES.AI_IMPORT,
      SAAS_MODULES.OPEN_FOOD_FACTS,
      SAAS_MODULES.ENTERPRISE_LABELS,
      SAAS_MODULES.API_ACCESS,
    ],
  },
];

export function getSaaSPlan(code: string) {
  return SAAS_PLANS.find((plan) => plan.code === code);
}

export function getStripePriceEnvKey(planCode: string, interval: BillingInterval) {
  return `STRIPE_PRICE_${planCode.toUpperCase()}_${interval.toUpperCase()}`;
}

export function getBillingIntervalLabel(interval: BillingInterval) {
  return BILLING_INTERVALS.find((item) => item.value === interval)?.label ?? interval;
}

export function getPlanPriceCents(
  plan: Pick<SaaSPlanDefinition, "monthlyPriceCents" | "quarterlyPriceCents" | "semiannualPriceCents" | "yearlyPriceCents">,
  interval: BillingInterval,
) {
  if (interval === "year") return plan.yearlyPriceCents;
  if (interval === "semester") return plan.semiannualPriceCents;
  if (interval === "quarter") return plan.quarterlyPriceCents;
  return plan.monthlyPriceCents;
}
