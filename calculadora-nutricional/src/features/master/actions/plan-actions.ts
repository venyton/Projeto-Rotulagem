'use server'

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SaaSModuleKey } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { MODULE_CATALOG, isSaaSModuleKey } from "@/features/saas/domain/modules";
import { getCurrentInternalMaster } from "@/features/master/services/master-access";

function normalizeCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function moneyToCents(value: FormDataEntryValue | null) {
  const text = String(value ?? "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");
  const amount = Number(text || "0");
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
}

function text(value: FormDataEntryValue | null, max = 160) {
  return String(value ?? "").trim().slice(0, max);
}

export async function savePlan(formData: FormData) {
  const master = await getCurrentInternalMaster();
  if (!master) redirect("/dashboard");

  const planId = text(formData.get("planId"));
  const code = normalizeCode(text(formData.get("code"), 80));
  const name = text(formData.get("name"), 100);
  const description = text(formData.get("description"), 500);
  const active = formData.get("active") === "on";
  const moduleKeys = formData
    .getAll("modules")
    .map((value) => String(value))
    .filter(isSaaSModuleKey);

  if (!code || !name) redirect("/dashboard/master/plans?error=invalid");

  const data = {
    code,
    name,
    description,
    active,
    monthlyPriceCents: moneyToCents(formData.get("monthlyPrice")),
    quarterlyPriceCents: moneyToCents(formData.get("quarterlyPrice")),
    semiannualPriceCents: moneyToCents(formData.get("semiannualPrice")),
    yearlyPriceCents: moneyToCents(formData.get("yearlyPrice")),
    stripeMonthlyPriceId: text(formData.get("stripeMonthlyPriceId"), 120) || null,
    stripeQuarterlyPriceId: text(formData.get("stripeQuarterlyPriceId"), 120) || null,
    stripeSemiannualPriceId: text(formData.get("stripeSemiannualPriceId"), 120) || null,
    stripeYearlyPriceId: text(formData.get("stripeYearlyPriceId"), 120) || null,
  };

  const plan = planId
    ? await prisma.plan.update({ where: { id: planId }, data })
    : await prisma.plan.create({ data });

  for (const moduleDefinition of MODULE_CATALOG) {
    const enabled = moduleKeys.includes(moduleDefinition.key);
    await prisma.planModule.upsert({
      where: {
        planId_moduleKey: {
          planId: plan.id,
          moduleKey: moduleDefinition.key as SaaSModuleKey,
        },
      },
      create: {
        planId: plan.id,
        moduleKey: moduleDefinition.key as SaaSModuleKey,
        enabled,
      },
      update: { enabled },
    });
  }

  await prisma.securityAuditLog.create({
    data: {
      userId: master.id,
      action: "master.plan.saved",
      riskLevel: "INFO",
      metadata: {
        planId: plan.id,
        code: plan.code,
        modules: moduleKeys,
      },
    },
  }).catch(() => null);

  revalidatePath("/");
  revalidatePath("/dashboard/master/plans");
  redirect("/dashboard/master/plans?saved=1");
}
