import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

import { Prisma, type PrismaClient } from "@prisma/client";

import { CommercialBenefitError, normalizeCouponCode } from "@/features/commercial-catalog/domain/commercial-benefits";
import { redeemCouponForSubscriptionWithClient } from "@/features/commercial-catalog/persistence/coupon-redemption-core";

import type { BillingProvider } from "../domain/billing-provider";
import { mapBillingIntervalToAsaasCycle, validateCheckoutOffer } from "../domain/checkout";
import { ensureAsaasCustomerMappingWithClient } from "./customer-mapping-core";

const CHECKOUT_EXPIRATION_MINUTES = 30;
const CREATING_LEASE_MS = 120_000;

export type BillingDatabase = PrismaClient;

export class BillingCheckoutError extends Error {
  constructor(
    public code:
      | "INVALID_PRICE"
      | "INVALID_COUPON"
      | "NO_PUBLISHED_OFFER"
      | "CUSTOMER_DATA_REQUIRED"
      | "IN_PROGRESS"
      | "RECONCILIATION_REQUIRED"
      | "NOT_FOUND"
      | "NOT_CANCELABLE"
      | "APP_ORIGIN_NOT_CONFIGURED"
      | "PROVIDER_ERROR"
      | "PERSISTENCE_ERROR",
  ) {
    super(`Checkout indisponível: ${code}.`);
    this.name = "BillingCheckoutError";
  }
}

function hashState(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function callbackUrl(origin: string, attemptId: string, outcome: "success" | "cancel" | "expired", state: string) {
  const url = new URL(`/dashboard/billing/checkout/${attemptId}/${outcome}`, origin);
  url.searchParams.set("state", state);
  return url.toString();
}

function providerFailureCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code.slice(0, 100);
  }
  return "PROVIDER_ERROR";
}

export async function startRecurringCheckoutWithClient(
  database: BillingDatabase,
  provider: BillingProvider,
  input: {
    organizationId: string;
    actorUserId: string;
    billingPriceId: string;
    cpfCnpj?: string;
    email?: string;
    mobilePhone?: string;
    couponCode?: string;
    appOrigin: string;
    now?: Date;
  },
) {
  const billingPriceId = input.billingPriceId.trim();
  if (!billingPriceId || billingPriceId.length > 191) throw new BillingCheckoutError("INVALID_PRICE");
  const now = input.now ?? new Date();
  const offer = await database.billingPrice.findFirst({
    where: {
      id: billingPriceId,
      status: "ACTIVE",
      currency: "BRL",
      planVersion: { status: "PUBLISHED", plan: { active: true, status: "ACTIVE" } },
    },
    select: {
      id: true,
      amountMinor: true,
      currency: true,
      billingInterval: true,
      planVersionId: true,
      planVersion: {
        select: {
          versionNumber: true,
          planId: true,
          plan: { select: { name: true } },
        },
      },
    },
  });
  if (!offer) throw new BillingCheckoutError("NO_PUBLISHED_OFFER");
  let requestedCoupon: string | null = null;
  try {
    requestedCoupon = input.couponCode?.trim() ? normalizeCouponCode(input.couponCode) : null;
  } catch {
    throw new BillingCheckoutError("INVALID_COUPON");
  }

  const organization = await database.organization.findFirst({
    where: { id: input.organizationId, status: "ACTIVE" },
    select: { id: true, name: true },
  });
  if (!organization) throw new BillingCheckoutError("NOT_FOUND");

  const state = randomBytes(32).toString("base64url");
  const externalReference = `soizi_checkout_${randomUUID()}`;
  const expiresAt = new Date(now.getTime() + CHECKOUT_EXPIRATION_MINUTES * 60_000);

  const claim = await (async () => {
    try {
      return await database.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'soizi:checkout:' + input.organizationId}))::text AS lock`;
    const current = await tx.billingCheckoutAttempt.findFirst({
      where: {
        organizationId: input.organizationId,
        status: { in: ["CREATING", "ACTIVE", "OUTCOME_UNKNOWN"] },
      },
      orderBy: { createdAt: "desc" },
      include: { couponRedemption: { select: { coupon: { select: { codeNormalized: true } } } } },
    });
    if (current?.status === "OUTCOME_UNKNOWN") {
      throw new BillingCheckoutError("RECONCILIATION_REQUIRED");
    }
    if (current?.status === "ACTIVE" && current.checkoutUrl && current.expiresAt > now) {
      if (current.billingPriceId !== offer.id || (current.couponRedemption?.coupon.codeNormalized ?? null) !== requestedCoupon) {
        throw new BillingCheckoutError("IN_PROGRESS");
      }
      return { reused: true as const, attempt: current };
    }
    if (current?.status === "CREATING" && current.createdAt.getTime() + CREATING_LEASE_MS > now.getTime()) {
      throw new BillingCheckoutError("IN_PROGRESS");
    }
    if (current) {
      await tx.billingCheckoutAttempt.update({
        where: { id: current.id },
        data: {
          status: current.status === "ACTIVE" ? "EXPIRED" : "FAILED",
          lastErrorCode: current.status === "ACTIVE" ? "LOCAL_EXPIRATION" : "CREATING_LEASE_EXPIRED",
        },
      });
      if (current.couponRedemptionId) {
        await tx.couponRedemption.updateMany({
          where: { id: current.couponRedemptionId, revokedAt: null },
          data: { revokedAt: now },
        });
      }
    }
    const subscription = await tx.subscription.create({
      data: {
        organizationId: input.organizationId,
        planId: offer.planVersion.planId,
        planVersionId: offer.planVersionId,
        billingPriceId: offer.id,
        provider: "ASAAS",
        status: "INCOMPLETE",
      },
      select: { id: true },
    });
    const redemption = requestedCoupon
      ? await redeemCouponForSubscriptionWithClient(tx, {
        code: requestedCoupon,
        organizationId: input.organizationId,
        subscriptionId: subscription.id,
        planId: offer.planVersion.planId,
        originalAmountMinor: offer.amountMinor,
        currency: offer.currency,
        at: now,
      })
      : null;
    const attempt = await tx.billingCheckoutAttempt.create({
      data: {
        organizationId: input.organizationId,
        subscriptionId: subscription.id,
        billingPriceId: offer.id,
        couponRedemptionId: redemption?.id ?? null,
        amountMinorSnapshot: redemption?.finalAmountMinor ?? offer.amountMinor,
        createdByUserId: input.actorUserId,
        provider: "ASAAS",
        externalReference,
        status: "CREATING",
        callbackStateHash: hashState(state),
        expiresAt,
      },
    });
    return { reused: false as const, attempt };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    } catch (error) {
      if (error instanceof BillingCheckoutError) throw error;
      if (error instanceof CommercialBenefitError || requestedCoupon) throw new BillingCheckoutError("INVALID_COUPON");
      throw error;
    }
  })();

  if (claim.reused) {
    return { attemptId: claim.attempt.id, checkoutUrl: claim.attempt.checkoutUrl!, source: "existing" as const };
  }

  const attempt = claim.attempt;
  const successUrl = callbackUrl(input.appOrigin, attempt.id, "success", state);
  const cancelUrl = callbackUrl(input.appOrigin, attempt.id, "cancel", state);
  const expiredUrl = callbackUrl(input.appOrigin, attempt.id, "expired", state);
  const normalized = validateCheckoutOffer({
    amountMinor: attempt.amountMinorSnapshot,
    currency: offer.currency,
    expiresInMinutes: CHECKOUT_EXPIRATION_MINUTES,
    externalReference,
    name: offer.planVersion.plan.name,
    callbackUrls: [successUrl, cancelUrl, expiredUrl],
  });

  try {
    const existingMapping = await database.billingCustomer.findUnique({
      where: { organizationId_provider: { organizationId: input.organizationId, provider: "ASAAS" } },
    });
    const mapping = existingMapping?.status === "ACTIVE" && existingMapping.providerCustomerId
      ? existingMapping
      : (input.cpfCnpj
        ? (await ensureAsaasCustomerMappingWithClient(database, {
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            name: organization.name,
            cpfCnpj: input.cpfCnpj,
            email: input.email,
            mobilePhone: input.mobilePhone,
          }, provider)).mapping
        : null);
    if (!mapping?.providerCustomerId) throw new BillingCheckoutError("CUSTOMER_DATA_REQUIRED");

    const checkout = await provider.createRecurringCheckout({
      externalReference: normalized.externalReference,
      customerId: mapping.providerCustomerId,
      expiresInMinutes: CHECKOUT_EXPIRATION_MINUTES,
      callback: { successUrl, cancelUrl, expiredUrl },
      item: {
        externalReference: offer.id,
        name: normalized.name,
        description: `Assinatura SoIZI — versão ${offer.planVersion.versionNumber}`,
        quantity: 1,
        amountMinor: attempt.amountMinorSnapshot,
        currency: "BRL",
      },
      subscription: {
        cycle: mapBillingIntervalToAsaasCycle(offer.billingInterval),
        nextDueDate: now.toISOString().slice(0, 10),
      },
    });
    if (checkout.externalReference !== externalReference) throw new BillingCheckoutError("PROVIDER_ERROR");

    await database.$transaction([
      database.billingCheckoutAttempt.update({
        where: { id: attempt.id },
        data: {
          providerCheckoutId: checkout.id,
          providerStatus: checkout.status,
          status: checkout.status,
          checkoutUrl: checkout.link,
          lastErrorCode: null,
        },
      }),
      database.securityAuditLog.create({
        data: {
          organizationId: input.organizationId,
          userId: input.actorUserId,
          action: "billing.checkout.created",
          riskLevel: "INFO",
          targetType: "BillingCheckoutAttempt",
          targetId: attempt.id,
          correlationId: externalReference,
          metadata: { provider: "ASAAS", priceId: offer.id, interval: offer.billingInterval, couponApplied: Boolean(attempt.couponRedemptionId) },
        },
      }),
    ]);
    return { attemptId: attempt.id, checkoutUrl: checkout.link, source: "created" as const };
  } catch (error) {
    const outcomeUnknown = Boolean(
      error && typeof error === "object" && "outcomeUnknown" in error && error.outcomeUnknown === true,
    );
    const errorCode = error instanceof BillingCheckoutError ? error.code : providerFailureCode(error);
    await database.billingCheckoutAttempt.updateMany({
      where: { id: attempt.id, status: "CREATING" },
      data: { status: outcomeUnknown ? "OUTCOME_UNKNOWN" : "FAILED", lastErrorCode: errorCode },
    });
    if (attempt.couponRedemptionId && !outcomeUnknown) {
      await database.couponRedemption.updateMany({
        where: { id: attempt.couponRedemptionId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    if (error instanceof BillingCheckoutError) throw error;
    throw new BillingCheckoutError(outcomeUnknown ? "RECONCILIATION_REQUIRED" : "PROVIDER_ERROR");
  }
}

export async function cancelCheckoutWithClient(database: BillingDatabase, provider: BillingProvider, input: {
  organizationId: string;
  actorUserId: string;
  attemptId: string;
}) {
  const attempt = await database.billingCheckoutAttempt.findFirst({
    where: { id: input.attemptId, organizationId: input.organizationId },
  });
  if (!attempt) throw new BillingCheckoutError("NOT_FOUND");
  if (attempt.status !== "ACTIVE" || !attempt.providerCheckoutId) {
    throw new BillingCheckoutError("NOT_CANCELABLE");
  }
  try {
    const remote = await provider.cancelCheckout(attempt.providerCheckoutId);
    if (remote.id !== attempt.providerCheckoutId || remote.status !== "CANCELED") {
      throw new BillingCheckoutError("PROVIDER_ERROR");
    }
    await database.$transaction([
      database.billingCheckoutAttempt.update({
        where: { id: attempt.id },
        data: { status: "CANCELED", providerStatus: "CANCELED", checkoutUrl: null },
      }),
      database.securityAuditLog.create({
        data: {
          organizationId: input.organizationId,
          userId: input.actorUserId,
          action: "billing.checkout.canceled",
          riskLevel: "INFO",
          targetType: "BillingCheckoutAttempt",
          targetId: attempt.id,
        },
      }),
      ...(attempt.couponRedemptionId
        ? [database.couponRedemption.update({ where: { id: attempt.couponRedemptionId }, data: { revokedAt: new Date() } })]
        : []),
    ]);
  } catch (error) {
    if (error instanceof BillingCheckoutError) throw error;
    throw new BillingCheckoutError("PROVIDER_ERROR");
  }
}

export async function verifyCheckoutReturnWithClient(database: BillingDatabase, input: {
  organizationId: string;
  attemptId: string;
  state: string;
}) {
  if (!input.state || input.state.length > 128) return false;
  const attempt = await database.billingCheckoutAttempt.findFirst({
    where: { id: input.attemptId, organizationId: input.organizationId },
    select: { callbackStateHash: true },
  });
  if (!attempt) return false;
  const actual = Buffer.from(hashState(input.state), "hex");
  const expected = Buffer.from(attempt.callbackStateHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
