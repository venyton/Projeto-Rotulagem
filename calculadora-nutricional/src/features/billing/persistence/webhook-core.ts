import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@prisma/client";

import {
  SUPPORTED_ASAAS_WEBHOOK_EVENTS,
  billingMinorFromProviderValue,
  parseAndSanitizeAsaasWebhook,
  type SanitizedAsaasWebhookEvent,
} from "../domain/webhook";
import type { BillingReconciliationProvider } from "../domain/billing-provider";

const PROCESSING_LEASE_MS = 60_000;
type BillingDatabase = PrismaClient;
type BillingTransaction = Prisma.TransactionClient;

export class BillingWebhookProcessingError extends Error {
  constructor(public code: string) {
    super(`Webhook pendente de reconciliação: ${code}.`);
    this.name = "BillingWebhookProcessingError";
  }
}

function safeEventDate(value: string | null) {
  if (!value) return null;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function safeResourceDate(value: string | null, fallback: Date) {
  if (!value) return fallback;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function addBillingPeriod(date: Date, interval: "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY") {
  const result = new Date(date);
  const months = interval === "MONTHLY" ? 1 : interval === "QUARTERLY" ? 3 : interval === "SEMIANNUAL" ? 6 : 12;
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

function errorCode(error: unknown) {
  if (error instanceof BillingWebhookProcessingError) return error.code;
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code.slice(0, 100);
  }
  return "PROCESSING_FAILED";
}

export async function ingestAsaasWebhookWithClient(
  database: BillingDatabase,
  event: SanitizedAsaasWebhookEvent,
  payloadHash: string,
) {
  const existing = await database.billingWebhookEvent.findUnique({
    where: { providerEventId: event.id },
    select: { id: true, payloadHash: true, status: true },
  });
  if (existing) {
    if (existing.payloadHash && existing.payloadHash !== payloadHash) {
      await database.billingWebhookEvent.update({
        where: { id: existing.id },
        data: { lastErrorCode: "EVENT_ID_PAYLOAD_MISMATCH" },
      });
    }
    return { eventId: existing.id, duplicate: true, status: existing.status };
  }
  try {
    const created = await database.billingWebhookEvent.create({
      data: {
        provider: "ASAAS",
        providerEventId: event.id,
        type: event.event,
        status: "RECEIVED",
        payload: event as unknown as Prisma.InputJsonValue,
        payloadHash,
        eventDate: safeEventDate(event.dateCreated),
      },
      select: { id: true, status: true },
    });
    return { eventId: created.id, duplicate: false, status: created.status };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await database.billingWebhookEvent.findUniqueOrThrow({
        where: { providerEventId: event.id },
        select: { id: true, status: true },
      });
      return { eventId: raced.id, duplicate: true, status: raced.status };
    }
    throw error;
  }
}

async function applyCheckoutEvent(tx: BillingTransaction, event: SanitizedAsaasWebhookEvent) {
  const resource = event.checkout!;
  const attempt = await tx.billingCheckoutAttempt.findUnique({
    where: { providerCheckoutId: resource.id },
    select: { id: true, organizationId: true, status: true, couponRedemptionId: true },
  });
  if (!attempt) throw new BillingWebhookProcessingError("CHECKOUT_NOT_MAPPED");
  let status = attempt.status;
  if (event.event === "CHECKOUT_PAID") status = "PAID";
  else if (attempt.status !== "PAID" && event.event === "CHECKOUT_CANCELED") status = "CANCELED";
  else if (attempt.status !== "PAID" && event.event === "CHECKOUT_EXPIRED") status = "EXPIRED";
  else if (attempt.status === "CREATING" && event.event === "CHECKOUT_CREATED") status = "ACTIVE";
  await tx.billingCheckoutAttempt.update({
    where: { id: attempt.id },
    data: {
      status,
      providerStatus: resource.status ?? status,
      ...(status === "ACTIVE" ? {} : { checkoutUrl: null }),
    },
  });
  if ((status === "CANCELED" || status === "EXPIRED") && attempt.couponRedemptionId) {
    await tx.couponRedemption.updateMany({
      where: { id: attempt.couponRedemptionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  return attempt.organizationId;
}

async function findSubscriptionForEvent(tx: BillingTransaction, event: SanitizedAsaasWebhookEvent) {
  const resource = event.subscription!;
  const byProvider = await tx.subscription.findUnique({
    where: { providerSubscriptionId: resource.id },
    include: { billingPrice: true, checkoutAttempts: { orderBy: { createdAt: "desc" }, take: 1, select: { amountMinorSnapshot: true } } },
  });
  if (byProvider) return byProvider;
  if (resource.externalReference) {
    const byInternalReference = await tx.subscription.findFirst({
      where: { id: resource.externalReference, provider: "ASAAS" },
      include: { billingPrice: true, checkoutAttempts: { orderBy: { createdAt: "desc" }, take: 1, select: { amountMinorSnapshot: true } } },
    });
    if (byInternalReference) return byInternalReference;
  }
  throw new BillingWebhookProcessingError("SUBSCRIPTION_NOT_MAPPED");
}

async function applySubscriptionEvent(tx: BillingTransaction, event: SanitizedAsaasWebhookEvent) {
  const resource = event.subscription!;
  const subscription = await findSubscriptionForEvent(tx, event);
  if (resource.value !== null && subscription.billingPrice) {
    const expectedAmount = subscription.checkoutAttempts[0]?.amountMinorSnapshot ?? subscription.billingPrice.amountMinor;
    if (billingMinorFromProviderValue(resource.value) !== expectedAmount) {
      throw new BillingWebhookProcessingError("SUBSCRIPTION_AMOUNT_MISMATCH");
    }
  }
  if (subscription.providerSubscriptionId && subscription.providerSubscriptionId !== resource.id) {
    throw new BillingWebhookProcessingError("SUBSCRIPTION_ID_MISMATCH");
  }
  const canceled = event.event === "SUBSCRIPTION_INACTIVATED" || event.event === "SUBSCRIPTION_DELETED";
  await tx.subscription.update({
    where: { id: subscription.id },
    data: {
      providerSubscriptionId: resource.id,
      ...(canceled ? { status: "CANCELED", cancelAtPeriodEnd: false } : {}),
    },
  });
  return subscription.organizationId;
}

const chargeRank = {
  PENDING: 0,
  CANCELED: 1,
  OVERDUE: 2,
  CONFIRMED: 3,
  RECEIVED: 4,
  REFUNDED: 5,
  CHARGEBACK: 6,
} as const;

function chargeStatus(event: string) {
  if (event === "PAYMENT_CONFIRMED") return "CONFIRMED" as const;
  if (event === "PAYMENT_RECEIVED") return "RECEIVED" as const;
  if (event === "PAYMENT_OVERDUE") return "OVERDUE" as const;
  if (event === "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED") return "CANCELED" as const;
  if (event === "PAYMENT_REFUNDED") return "REFUNDED" as const;
  if (event === "PAYMENT_CHARGEBACK_REQUESTED") return "CHARGEBACK" as const;
  return "PENDING" as const;
}

async function applyPaymentEvent(tx: BillingTransaction, event: SanitizedAsaasWebhookEvent, now: Date) {
  const payment = event.payment!;
  const attempt = payment.checkoutSession
      ? await tx.billingCheckoutAttempt.findUnique({
        where: { providerCheckoutId: payment.checkoutSession },
        include: { subscription: { include: { billingPrice: true, checkoutAttempts: { orderBy: { createdAt: "desc" }, take: 1, select: { amountMinorSnapshot: true } } } } },
      })
    : null;
  const byProvider = payment.subscription
      ? await tx.subscription.findUnique({
        where: { providerSubscriptionId: payment.subscription },
        include: { billingPrice: true, checkoutAttempts: { orderBy: { createdAt: "desc" }, take: 1, select: { amountMinorSnapshot: true } } },
      })
    : null;
  const subscription = byProvider ?? attempt?.subscription;
  if (!subscription || !subscription.billingPrice) {
    throw new BillingWebhookProcessingError("PAYMENT_SUBSCRIPTION_NOT_MAPPED");
  }
  if (
    payment.subscription
    && subscription.providerSubscriptionId
    && subscription.providerSubscriptionId !== payment.subscription
  ) {
    throw new BillingWebhookProcessingError("PAYMENT_SUBSCRIPTION_ID_MISMATCH");
  }
  const amountMinor = billingMinorFromProviderValue(payment.value);
  const expectedAmount = attempt?.amountMinorSnapshot
    ?? subscription.checkoutAttempts[0]?.amountMinorSnapshot
    ?? subscription.billingPrice.amountMinor;
  if (amountMinor !== expectedAmount) {
    throw new BillingWebhookProcessingError("PAYMENT_AMOUNT_MISMATCH");
  }

  const existingCharge = await tx.billingCharge.findUnique({
    where: { providerChargeId: payment.id },
  });
  const incomingStatus = chargeStatus(event.event);
  const effectiveStatus = existingCharge && chargeRank[existingCharge.status] > chargeRank[incomingStatus]
    ? existingCharge.status
    : incomingStatus;
  const effectiveAdvanced = !existingCharge || chargeRank[incomingStatus] >= chargeRank[existingCharge.status];
  const financialDate = safeResourceDate(
    payment.confirmedDate ?? payment.paymentDate ?? payment.dueDate,
    safeEventDate(event.dateCreated) ?? now,
  );

  await tx.billingCharge.upsert({
    where: { providerChargeId: payment.id },
    create: {
      organizationId: subscription.organizationId,
      subscriptionId: subscription.id,
      checkoutAttemptId: attempt?.id,
      provider: "ASAAS",
      providerChargeId: payment.id,
      externalReference: `asaas_payment_${payment.id}`,
      status: effectiveStatus,
      amountMinor,
      currency: "BRL",
      dueDate: payment.dueDate ? safeResourceDate(payment.dueDate, financialDate) : null,
      confirmedAt: ["CONFIRMED", "RECEIVED"].includes(effectiveStatus) ? financialDate : null,
      paidAt: effectiveStatus === "RECEIVED" ? financialDate : null,
      lastSyncedAt: now,
    },
    update: {
      status: effectiveStatus,
      checkoutAttemptId: existingCharge?.checkoutAttemptId ?? attempt?.id,
      confirmedAt: existingCharge?.confirmedAt
        ?? (["CONFIRMED", "RECEIVED"].includes(effectiveStatus) ? financialDate : null),
      paidAt: existingCharge?.paidAt ?? (effectiveStatus === "RECEIVED" ? financialDate : null),
      lastSyncedAt: now,
      lastErrorCode: null,
    },
  });

  const subscriptionUpdate: Prisma.SubscriptionUpdateInput = {
    ...(payment.subscription && !subscription.providerSubscriptionId
      ? { providerSubscriptionId: payment.subscription }
      : {}),
  };
  if (effectiveAdvanced && (incomingStatus === "CONFIRMED" || incomingStatus === "RECEIVED")) {
    subscriptionUpdate.status = "ACTIVE";
    if (!existingCharge?.confirmedAt) {
      subscriptionUpdate.currentPeriodStart = financialDate;
      subscriptionUpdate.currentPeriodEnd = addBillingPeriod(financialDate, subscription.billingPrice.billingInterval);
    }
  } else if (effectiveAdvanced && incomingStatus === "OVERDUE" && subscription.status !== "CANCELED") {
    subscriptionUpdate.status = "PAST_DUE";
  } else if (
    effectiveAdvanced
    && (incomingStatus === "REFUNDED" || incomingStatus === "CHARGEBACK")
    && subscription.status !== "CANCELED"
  ) {
    subscriptionUpdate.status = "PAST_DUE";
  } else if (
    effectiveAdvanced
    && incomingStatus === "CANCELED"
    && subscription.status !== "CANCELED"
    && subscription.status !== "INCOMPLETE"
  ) {
    subscriptionUpdate.status = "PAST_DUE";
  }
  await tx.subscription.update({ where: { id: subscription.id }, data: subscriptionUpdate });
  if (attempt && (incomingStatus === "CONFIRMED" || incomingStatus === "RECEIVED")) {
    await tx.billingCheckoutAttempt.update({
      where: { id: attempt.id },
      data: { status: "PAID", providerStatus: "PAID", checkoutUrl: null },
    });
  }
  return subscription.organizationId;
}

async function applyEvent(tx: BillingTransaction, event: SanitizedAsaasWebhookEvent, now: Date) {
  if (event.event.startsWith("CHECKOUT_")) return applyCheckoutEvent(tx, event);
  if (event.event.startsWith("SUBSCRIPTION_")) return applySubscriptionEvent(tx, event);
  if (event.event.startsWith("PAYMENT_")) return applyPaymentEvent(tx, event, now);
  return null;
}

export async function processBillingWebhookEventWithClient(
  database: BillingDatabase,
  inboxEventId: string,
  now = new Date(),
) {
  const leaseId = randomUUID();
  const leaseExpiresAt = new Date(now.getTime() + PROCESSING_LEASE_MS);
  const claimed = await database.billingWebhookEvent.updateMany({
    where: {
      id: inboxEventId,
      status: { in: ["RECEIVED", "FAILED"] },
      OR: [{ processingLeaseId: null }, { processingLeaseExpiresAt: { lt: now } }],
    },
    data: {
      status: "PROCESSING",
      processingLeaseId: leaseId,
      processingLeaseExpiresAt: leaseExpiresAt,
      processingAttempts: { increment: 1 },
      lastErrorCode: null,
      errorMessage: null,
    },
  });
  if (claimed.count !== 1) {
    const current = await database.billingWebhookEvent.findUnique({
      where: { id: inboxEventId },
      select: { status: true },
    });
    return { processed: false, status: current?.status ?? "MISSING" };
  }

  try {
    return await database.$transaction(async (tx) => {
      const inbox = await tx.billingWebhookEvent.findFirstOrThrow({
        where: { id: inboxEventId, processingLeaseId: leaseId },
      });
      const event = parseAndSanitizeAsaasWebhook(JSON.stringify(inbox.payload));
      const supported = SUPPORTED_ASAAS_WEBHOOK_EVENTS.has(event.event);
      const organizationId = supported ? await applyEvent(tx, event, now) : null;
      const status = supported ? "PROCESSED" as const : "IGNORED" as const;
      await tx.billingWebhookEvent.update({
        where: { id: inbox.id },
        data: {
          organizationId,
          status,
          processedAt: now,
          processingLeaseId: null,
          processingLeaseExpiresAt: null,
          lastErrorCode: null,
        },
      });
      if (organizationId) {
        await tx.securityAuditLog.create({
          data: {
            organizationId,
            action: "billing.webhook.processed",
            actorType: "SYSTEM",
            riskLevel: "INFO",
            targetType: "BillingWebhookEvent",
            targetId: inbox.id,
            correlationId: inbox.providerEventId,
            metadata: { provider: "ASAAS", event: event.event },
          },
        });
      }
      return { processed: true, status };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  } catch (error) {
    const code = errorCode(error);
    await database.billingWebhookEvent.updateMany({
      where: { id: inboxEventId, processingLeaseId: leaseId },
      data: {
        status: "FAILED",
        processingLeaseId: null,
        processingLeaseExpiresAt: null,
        lastErrorCode: code,
        errorMessage: null,
      },
    });
    throw new BillingWebhookProcessingError(code);
  }
}

export async function processPendingBillingWebhooksWithClient(database: BillingDatabase, limit = 25) {
  const candidates = await database.billingWebhookEvent.findMany({
    where: { provider: "ASAAS", status: { in: ["RECEIVED", "FAILED"] } },
    select: { id: true },
    orderBy: [{ eventDate: "asc" }, { createdAt: "asc" }],
    take: Math.min(Math.max(limit, 1), 100),
  });
  const results = [];
  for (const candidate of candidates) {
    try {
      results.push(await processBillingWebhookEventWithClient(database, candidate.id));
    } catch (error) {
      results.push({ processed: false, status: errorCode(error) });
    }
  }
  return results;
}

function reconciliationEvent(status: string) {
  if (status === "CONFIRMED") return "PAYMENT_CONFIRMED";
  if (status === "RECEIVED") return "PAYMENT_RECEIVED";
  if (status === "OVERDUE") return "PAYMENT_OVERDUE";
  if (status === "REFUNDED") return "PAYMENT_REFUNDED";
  if (status === "CHARGEBACK_REQUESTED") return "PAYMENT_CHARGEBACK_REQUESTED";
  return "PAYMENT_UPDATED";
}

export async function reconcileCheckoutAttemptWithClient(
  database: BillingDatabase,
  provider: BillingReconciliationProvider,
  input: { organizationId: string; attemptId: string; actorUserId?: string; now?: Date },
) {
  const attempt = await database.billingCheckoutAttempt.findFirst({
    where: { id: input.attemptId, organizationId: input.organizationId, provider: "ASAAS" },
    select: { id: true, providerCheckoutId: true },
  });
  if (!attempt) throw new BillingWebhookProcessingError("CHECKOUT_NOT_FOUND");
  if (!attempt.providerCheckoutId) throw new BillingWebhookProcessingError("CHECKOUT_PROVIDER_ID_MISSING");
  const payments = await provider.listPaymentsByCheckout(attempt.providerCheckoutId);
  if (payments.some((payment) => payment.checkoutId !== attempt.providerCheckoutId)) {
    throw new BillingWebhookProcessingError("RECONCILIATION_SCOPE_MISMATCH");
  }
  const now = input.now ?? new Date();
  for (const payment of payments) {
    const event: SanitizedAsaasWebhookEvent = {
      id: `evt_reconciliation_${payment.id}`,
      event: reconciliationEvent(payment.status),
      dateCreated: now.toISOString(),
      payment: {
        id: payment.id,
        status: payment.status,
        subscription: payment.subscriptionId,
        checkoutSession: payment.checkoutId,
        externalReference: null,
        value: payment.amountMinor / 100,
        dueDate: payment.dueDate,
        paymentDate: payment.paymentDate,
        confirmedDate: payment.confirmedDate,
      },
    };
    await database.$transaction(async (tx) => {
      const organizationId = await applyPaymentEvent(tx, event, now);
      if (organizationId !== input.organizationId) {
        throw new BillingWebhookProcessingError("RECONCILIATION_TENANT_MISMATCH");
      }
      await tx.securityAuditLog.create({
        data: {
          organizationId,
          userId: input.actorUserId,
          action: "billing.reconciliation.checkout",
          actorType: input.actorUserId ? "USER" : "SYSTEM",
          riskLevel: "MEDIUM",
          targetType: "BillingCheckoutAttempt",
          targetId: attempt.id,
          metadata: { provider: "ASAAS", paymentStatus: payment.status },
        },
      });
    });
  }
  return { status: payments.length === 0 ? "PENDING" as const : "RECONCILED" as const, payments: payments.length };
}
