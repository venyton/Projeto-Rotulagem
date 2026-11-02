"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { canManageOrganizationBilling } from "@/features/billing/domain/billing-authorization";
import {
  BillingCheckoutError,
  cancelCheckout,
  startRecurringCheckout,
} from "@/features/billing/services/checkout";
import { getCurrentSaaSContext } from "@/features/saas/services/entitlements";
import { ROLLOUT_FLAGS } from "@/features/rollout/domain/feature-flags";
import { isRolloutFeatureEnabled } from "@/features/rollout/services/feature-flags";
import { consumeRequestRateLimit, getRequestRateLimit } from "@/lib/security/request-rate-limit";
import { isDatabaseId } from "@/lib/validation/identifiers";

const ERROR_QUERY: Record<BillingCheckoutError["code"], string> = {
  INVALID_PRICE: "invalid_price",
  INVALID_COUPON: "invalid_coupon",
  NO_PUBLISHED_OFFER: "invalid_price",
  CUSTOMER_DATA_REQUIRED: "customer_required",
  IN_PROGRESS: "in_progress",
  RECONCILIATION_REQUIRED: "reconciliation",
  NOT_FOUND: "not_found",
  NOT_CANCELABLE: "not_cancelable",
  APP_ORIGIN_NOT_CONFIGURED: "configuration",
  PROVIDER_ERROR: "provider",
  PERSISTENCE_ERROR: "persistence",
};

async function requireBillingContext() {
  if (!await isRolloutFeatureEnabled(ROLLOUT_FLAGS.CUSTOMER_PLAN_UI)) redirect("/dashboard");
  const context = await getCurrentSaaSContext();
  if (!context) redirect("/login");
  if (!canManageOrganizationBilling(context.member.role)) redirect("/dashboard");
  return context;
}

export async function startRecurringCheckoutAction(formData: FormData) {
  const context = await requireBillingContext();
  if (!await isRolloutFeatureEnabled(ROLLOUT_FLAGS.BILLING_CHECKOUT)) {
    redirect("/dashboard/billing?error=configuration");
  }
  const limit = await consumeRequestRateLimit(
    "billing_checkout",
    `${context.organization.id}:${context.user.id}`,
    getRequestRateLimit("workspaceWrites"),
  );
  if (!limit.allowed) redirect("/dashboard/billing?error=rate_limit");

  let destination: string;
  try {
    const result = await startRecurringCheckout({
      organizationId: context.organization.id,
      actorUserId: context.user.id,
      billingPriceId: String(formData.get("billingPriceId") || ""),
      cpfCnpj: String(formData.get("cpfCnpj") || "") || undefined,
      email: String(formData.get("email") || "") || undefined,
      mobilePhone: String(formData.get("mobilePhone") || "") || undefined,
      couponCode: String(formData.get("couponCode") || "") || undefined,
    });
    destination = result.checkoutUrl;
  } catch (error) {
    const code = error instanceof BillingCheckoutError ? ERROR_QUERY[error.code] : "provider";
    destination = `/dashboard/billing?error=${code}`;
  }
  redirect(destination);
}

export async function cancelCheckoutAction(formData: FormData) {
  const context = await requireBillingContext();
  const attemptId = String(formData.get("attemptId") || "");
  if (!isDatabaseId(attemptId)) redirect("/dashboard/billing?error=not_found");
  const limit = await consumeRequestRateLimit(
    "billing_checkout_cancel",
    `${context.organization.id}:${context.user.id}`,
    getRequestRateLimit("workspaceWrites"),
  );
  if (!limit.allowed) redirect("/dashboard/billing?error=rate_limit");

  let destination = "/dashboard/billing?canceled=1";
  try {
    await cancelCheckout({
      organizationId: context.organization.id,
      actorUserId: context.user.id,
      attemptId,
    });
    revalidatePath("/dashboard/billing");
  } catch (error) {
    const code = error instanceof BillingCheckoutError ? ERROR_QUERY[error.code] : "provider";
    destination = `/dashboard/billing?error=${code}`;
  }
  redirect(destination);
}
