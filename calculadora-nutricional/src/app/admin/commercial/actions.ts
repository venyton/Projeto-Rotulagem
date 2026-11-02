"use server";

import { redirect } from "next/navigation";

import { parseBrlAmountToMinor } from "@/features/commercial-catalog/domain/catalog";
import { parsePercentToBasisPoints } from "@/features/commercial-catalog/domain/commercial-benefits";
import {
  activateCommercialCoupon,
  CommercialManagementError,
  createCommercialCoupon,
  createCommercialGrant,
  createEntitlementOverride,
  revokeCommercialGrant,
} from "@/features/commercial-catalog/services/commercial-benefits-management";
import { isDatabaseId } from "@/lib/validation/identifiers";

function value(formData: FormData, key: string) {
  const current = formData.get(key);
  return typeof current === "string" ? current.trim() : "";
}

function dateValue(formData: FormData, key: string, required = true) {
  const raw = value(formData, key);
  if (!raw && !required) return null;
  const date = new Date(raw);
  if (!raw || Number.isNaN(date.getTime())) throw new CommercialManagementError("INVALID_INPUT", "Data inválida.");
  return date;
}

function integer(valueToParse: string, nullable = false) {
  if (!valueToParse && nullable) return null;
  const parsed = Number(valueToParse);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new CommercialManagementError("INVALID_INPUT", "Número inteiro inválido.");
  return parsed;
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "A operação não foi concluída.";
}

export async function createCouponAction(formData: FormData) {
  try {
    const discountType = value(formData, "discountType") === "FIXED" ? "FIXED" : "PERCENT";
    await createCommercialCoupon({
      code: value(formData, "code"), name: value(formData, "name"), discountType,
      discountValue: discountType === "FIXED" ? parseBrlAmountToMinor(value(formData, "discountValue")) : parsePercentToBasisPoints(value(formData, "discountValue")),
      startsAt: dateValue(formData, "startsAt")!, endsAt: dateValue(formData, "endsAt")!,
      maxRedemptions: integer(value(formData, "maxRedemptions"), true),
      maxRedemptionsPerOrganization: integer(value(formData, "maxRedemptionsPerOrganization"))!,
      planIds: formData.getAll("planId").filter((item): item is string => typeof item === "string" && isDatabaseId(item)),
    });
  } catch (error) { redirect(`/admin/commercial/coupons?error=${encodeURIComponent(message(error))}`); }
  redirect("/admin/commercial/coupons?success=Cupom+criado+em+draft+para+revisão.");
}

export async function activateCouponAction(formData: FormData) {
  const couponId = value(formData, "couponId");
  if (!isDatabaseId(couponId)) redirect("/admin/commercial/coupons?error=Cupom+inválido.");
  try { await activateCommercialCoupon(couponId); }
  catch (error) { redirect(`/admin/commercial/coupons?error=${encodeURIComponent(message(error))}`); }
  redirect("/admin/commercial/coupons?success=Cupom+ativado+e+auditado.");
}

export async function createGrantAction(formData: FormData) {
  try {
    const organizationId = value(formData, "organizationId");
    const featureIds = formData.getAll("featureDefinitionId").filter((item): item is string => typeof item === "string" && isDatabaseId(item));
    if (!isDatabaseId(organizationId)) throw new CommercialManagementError("INVALID_INPUT", "Organização inválida.");
    const source = value(formData, "sourceType");
    if (!new Set(["COURTESY", "PARTNER", "SUPPORT", "MIGRATION", "OTHER"]).has(source)) throw new CommercialManagementError("INVALID_INPUT", "Origem inválida.");
    const expiresAt = dateValue(formData, "expiresAt", false);
    if (!expiresAt && value(formData, "confirmPermanent") !== "yes") throw new CommercialManagementError("INVALID_INPUT", "Grant sem expiração exige confirmação explícita.");
    await createCommercialGrant({
      organizationId, sourceType: source as "COURTESY", reason: value(formData, "reason"),
      startsAt: dateValue(formData, "startsAt")!, expiresAt,
      features: featureIds.map((featureDefinitionId) => ({ featureDefinitionId, limitValue: integer(value(formData, `limit:${featureDefinitionId}`), true) })),
    });
  } catch (error) { redirect(`/admin/commercial/grants?error=${encodeURIComponent(message(error))}`); }
  redirect("/admin/commercial/grants?success=Grant+criado+e+auditado.");
}

export async function revokeGrantAction(formData: FormData) {
  const grantId = value(formData, "grantId");
  if (!isDatabaseId(grantId)) redirect("/admin/commercial/grants?error=Grant+inválido.");
  try { await revokeCommercialGrant(grantId, value(formData, "reason")); }
  catch (error) { redirect(`/admin/commercial/grants?error=${encodeURIComponent(message(error))}`); }
  redirect("/admin/commercial/grants?success=Grant+revogado+e+auditado.");
}

export async function createOverrideAction(formData: FormData) {
  try {
    const organizationId = value(formData, "organizationId");
    const featureDefinitionId = value(formData, "featureDefinitionId");
    const mode = value(formData, "mode");
    if (!isDatabaseId(organizationId) || !isDatabaseId(featureDefinitionId) || !new Set(["ENABLE", "DISABLE", "SET_LIMIT"]).has(mode)) throw new CommercialManagementError("INVALID_INPUT", "Destino ou modo inválido.");
    const expiresAt = dateValue(formData, "expiresAt", false);
    if (!expiresAt && value(formData, "confirmPermanent") !== "yes") throw new CommercialManagementError("INVALID_INPUT", "Override sem expiração exige confirmação explícita.");
    await createEntitlementOverride({
      organizationId, featureDefinitionId, mode: mode as "ENABLE", reason: value(formData, "reason"),
      limitValue: mode === "SET_LIMIT" ? integer(value(formData, "limitValue")) : null,
      startsAt: dateValue(formData, "startsAt")!, expiresAt,
    });
  } catch (error) { redirect(`/admin/commercial/grants?error=${encodeURIComponent(message(error))}`); }
  redirect("/admin/commercial/grants?success=Override+criado+e+auditado.");
}
