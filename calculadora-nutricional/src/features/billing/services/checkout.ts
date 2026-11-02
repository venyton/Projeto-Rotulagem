import "server-only";

import { createAsaasBillingProvider } from "@/features/billing/integrations/asaas/asaas-provider";
import {
  BillingCheckoutError,
  cancelCheckoutWithClient,
  startRecurringCheckoutWithClient,
  verifyCheckoutReturnWithClient,
} from "@/features/billing/persistence/checkout-core";
import { prisma } from "@/lib/prisma";
import { getCanonicalAppOrigin } from "@/lib/security/app-origin";
import { ROLLOUT_FLAGS } from "@/features/rollout/domain/feature-flags";
import { requireRolloutFeature } from "@/features/rollout/services/feature-flags";

export { BillingCheckoutError } from "@/features/billing/persistence/checkout-core";

export async function startRecurringCheckout(
  input: Omit<Parameters<typeof startRecurringCheckoutWithClient>[2], "appOrigin">,
) {
  await requireRolloutFeature(ROLLOUT_FLAGS.BILLING_ASAAS);
  await requireRolloutFeature(ROLLOUT_FLAGS.BILLING_CHECKOUT);
  const appOrigin = getCanonicalAppOrigin();
  if (!appOrigin) throw new BillingCheckoutError("APP_ORIGIN_NOT_CONFIGURED");
  const provider = await createAsaasBillingProvider();
  return startRecurringCheckoutWithClient(prisma, provider, { ...input, appOrigin });
}

export async function cancelCheckout(input: Parameters<typeof cancelCheckoutWithClient>[2]) {
  await requireRolloutFeature(ROLLOUT_FLAGS.BILLING_ASAAS);
  const provider = await createAsaasBillingProvider();
  return cancelCheckoutWithClient(prisma, provider, input);
}

export function verifyCheckoutReturn(input: Parameters<typeof verifyCheckoutReturnWithClient>[1]) {
  return verifyCheckoutReturnWithClient(prisma, input);
}

export async function getOrganizationBillingOverview(organizationId: string) {
  const [offers, mapping, subscriptions, checkouts, charges] = await Promise.all([
    prisma.billingPrice.findMany({
      where: {
        status: "ACTIVE",
        currency: "BRL",
        planVersion: { status: "PUBLISHED", plan: { active: true, status: "ACTIVE" } },
      },
      select: {
        id: true,
        amountMinor: true,
        currency: true,
        billingInterval: true,
        planVersion: {
          select: { versionNumber: true, plan: { select: { name: true, description: true } } },
        },
      },
      orderBy: [{ amountMinor: "asc" }, { createdAt: "asc" }],
    }),
    prisma.billingCustomer.findUnique({
      where: { organizationId_provider: { organizationId, provider: "ASAAS" } },
      select: { status: true, lastSyncedAt: true, lastErrorCode: true },
    }),
    prisma.subscription.findMany({
      where: { organizationId },
      select: {
        id: true,
        status: true,
        currentPeriodEnd: true,
        billingPrice: { select: { amountMinor: true, currency: true, billingInterval: true } },
        couponRedemption: { select: { revokedAt: true, finalAmountMinor: true, appliedDiscountMinor: true, currency: true, coupon: { select: { codeNormalized: true } } } },
        planVersion: { select: { versionNumber: true, plan: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.billingCheckoutAttempt.findMany({
      where: { organizationId },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        checkoutUrl: true,
        lastErrorCode: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.billingCharge.findMany({
      where: { organizationId },
      select: {
        id: true,
        status: true,
        amountMinor: true,
        currency: true,
        dueDate: true,
        paidAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);
  return { offers, mapping, subscriptions, checkouts, charges };
}
