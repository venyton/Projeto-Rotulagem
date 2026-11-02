"use server";

import { redirect } from "next/navigation";

import {
  CatalogInvariantError,
  parseBrlAmountToMinor,
  type BillingInterval,
} from "@/features/commercial-catalog/domain/catalog";
import {
  CatalogManagementError,
  createPlanDraft,
  publishPlanVersion,
} from "@/features/commercial-catalog/services/catalog-management";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function actionErrorMessage(error: unknown) {
  if (error instanceof CatalogInvariantError || error instanceof CatalogManagementError) {
    return error.message;
  }
  return "Não foi possível concluir a operação. O catálogo permaneceu inalterado.";
}

export async function createPlanDraftAction(formData: FormData) {
  let planId: string;
  try {
    const featureDefinitionIds = formData.getAll("featureDefinitionId")
      .filter((value): value is string => typeof value === "string");
    const features = featureDefinitionIds.map((featureDefinitionId) => {
      const rawLimit = text(formData, `featureLimit:${featureDefinitionId}`).trim();
      const limitValue = rawLimit === "" ? null : Number(rawLimit);
      if (limitValue !== null && (!Number.isSafeInteger(limitValue) || limitValue < 0)) {
        throw new CatalogManagementError("INVALID_INPUT", "Limites devem ser inteiros não negativos.");
      }
      return { featureDefinitionId, limitValue };
    });

    const prices: Array<{ amountMinor: number; billingInterval: BillingInterval }> = [];
    for (const [field, billingInterval] of [
      ["monthlyPrice", "MONTHLY"],
      ["quarterlyPrice", "QUARTERLY"],
      ["semiannualPrice", "SEMIANNUAL"],
      ["yearlyPrice", "YEARLY"],
    ] as const) {
      const value = text(formData, field).trim();
      if (value) prices.push({ amountMinor: parseBrlAmountToMinor(value), billingInterval });
    }

    const result = await createPlanDraft({
      code: text(formData, "code"),
      name: text(formData, "name"),
      description: text(formData, "description"),
      isPaid: text(formData, "commercialModel") === "paid",
      features,
      prices,
    });
    planId = result.planId;
  } catch (error) {
    redirect(`/admin/catalog?error=${encodeURIComponent(actionErrorMessage(error))}`);
  }
  redirect(`/admin/catalog?created=${encodeURIComponent(planId)}`);
}

export async function publishPlanVersionAction(formData: FormData) {
  const planVersionId = text(formData, "planVersionId");
  if (text(formData, "confirmPublish") !== "yes") {
    redirect("/admin/catalog?error=Confirme+a+imutabilidade+antes+de+publicar.");
  }

  try {
    await publishPlanVersion(planVersionId);
  } catch (error) {
    redirect(`/admin/catalog?error=${encodeURIComponent(actionErrorMessage(error))}`);
  }
  redirect(`/admin/catalog?published=${encodeURIComponent(planVersionId)}`);
}
