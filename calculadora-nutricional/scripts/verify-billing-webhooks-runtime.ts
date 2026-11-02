import assert from "node:assert/strict";

import { PrismaClient } from "@prisma/client";

import { parseAndSanitizeAsaasWebhook, webhookPayloadHash } from "../src/features/billing/domain/webhook";
import {
  BillingWebhookProcessingError,
  ingestAsaasWebhookWithClient,
  processBillingWebhookEventWithClient,
  reconcileCheckoutAttemptWithClient,
} from "../src/features/billing/persistence/webhook-core";

const databaseUrl = process.env.POSTGRES_PRISMA_URL ?? "";
const parsedUrl = new URL(databaseUrl);
if (!(parsedUrl.hostname === "127.0.0.1" && parsedUrl.port === "54329")) {
  throw new Error("Smoke de webhooks recusado: use somente 127.0.0.1:54329.");
}

const prisma = new PrismaClient();
const fixture = {
  userA: "stage7-webhook-user-a",
  userB: "stage7-webhook-user-b",
  organizationA: "stage7-webhook-org-a",
  organizationB: "stage7-webhook-org-b",
  plan: "stage7-webhook-plan",
  version: "stage7-webhook-version",
  price: "stage7-webhook-price",
  subscriptionA: "stage7-webhook-subscription-a",
  subscriptionB: "stage7-webhook-subscription-b",
  attemptA: "stage7-webhook-attempt-a",
};

const eventIds = ["evt_stage7_payment&1", "evt_stage7_old&2", "evt_stage7_replay&3", "evt_stage7_future&4"];

async function cleanup() {
  const organizationIds = [fixture.organizationA, fixture.organizationB];
  await prisma.billingWebhookEvent.deleteMany({ where: { providerEventId: { in: eventIds } } });
  await prisma.billingCharge.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await prisma.billingCheckoutAttempt.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await prisma.subscription.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await prisma.securityAuditLog.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await prisma.billingCustomer.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await prisma.organizationMember.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: organizationIds } } });
  await prisma.plan.updateMany({
    where: { id: fixture.plan },
    data: { active: false, status: "ARCHIVED", archivedAt: new Date() },
  });
  await prisma.user.deleteMany({ where: { id: { in: [fixture.userA, fixture.userB] } } });
}

async function createFixtures() {
  await prisma.user.createMany({ data: [
    { id: fixture.userA, email: "stage7-webhook-a@example.test" },
    { id: fixture.userB, email: "stage7-webhook-b@example.test" },
  ], skipDuplicates: true });
  await prisma.organization.createMany({ data: [
    { id: fixture.organizationA, ownerId: fixture.userA, name: "Stage 7 A", slug: "stage7-webhook-a" },
    { id: fixture.organizationB, ownerId: fixture.userB, name: "Stage 7 B", slug: "stage7-webhook-b" },
  ], skipDuplicates: true });
  await prisma.plan.upsert({
    where: { id: fixture.plan },
    create: { id: fixture.plan, code: "STAGE7_WEBHOOK", name: "Plano Stage 7", status: "ACTIVE", active: true },
    update: { status: "ACTIVE", active: true, archivedAt: null },
  });
  await prisma.planVersion.upsert({
    where: { id: fixture.version },
    create: {
      id: fixture.version,
      planId: fixture.plan,
      versionNumber: 1,
      status: "PUBLISHED",
      publishedAt: new Date("2026-08-27T00:00:00.000Z"),
    },
    update: {},
  });
  await prisma.billingPrice.upsert({
    where: { id: fixture.price },
    create: {
      id: fixture.price,
      planVersionId: fixture.version,
      provider: "ASAAS",
      currency: "BRL",
      amountMinor: 12_990,
      billingInterval: "MONTHLY",
      status: "ACTIVE",
    },
    update: {},
  });
  await prisma.subscription.createMany({ data: [
    {
      id: fixture.subscriptionA,
      organizationId: fixture.organizationA,
      planId: fixture.plan,
      planVersionId: fixture.version,
      billingPriceId: fixture.price,
      provider: "ASAAS",
      status: "INCOMPLETE",
    },
    {
      id: fixture.subscriptionB,
      organizationId: fixture.organizationB,
      planId: fixture.plan,
      planVersionId: fixture.version,
      billingPriceId: fixture.price,
      provider: "ASAAS",
      status: "INCOMPLETE",
    },
  ] });
  await prisma.billingCheckoutAttempt.create({
    data: {
      id: fixture.attemptA,
      organizationId: fixture.organizationA,
      subscriptionId: fixture.subscriptionA,
      billingPriceId: fixture.price,
      amountMinorSnapshot: 12_990,
      createdByUserId: fixture.userA,
      provider: "ASAAS",
      externalReference: "stage7-checkout-attempt-a",
      providerCheckoutId: "checkout_stage7_a",
      status: "ACTIVE",
      providerStatus: "ACTIVE",
      callbackStateHash: "0".repeat(64),
      expiresAt: new Date("2026-08-27T13:00:00.000Z"),
    },
  });
}

function rawPayment(input: {
  id: string;
  providerEventId: string;
  subscription?: string;
  checkoutSession?: string;
  event?: string;
}) {
  return JSON.stringify({
    id: input.providerEventId,
    event: input.event ?? "PAYMENT_CONFIRMED",
    dateCreated: "2026-08-27 12:00:00",
    payment: {
      id: input.id,
      status: "CONFIRMED",
      subscription: input.subscription,
      checkoutSession: input.checkoutSession,
      value: 129.9,
      dueDate: "2026-08-27",
      futureProperty: { ignored: true },
    },
    futureTopLevel: "ignored",
  });
}

async function ingest(rawBody: string) {
  return ingestAsaasWebhookWithClient(
    prisma,
    parseAndSanitizeAsaasWebhook(rawBody),
    webhookPayloadHash(rawBody),
  );
}

async function main() {
  try {
    await cleanup();
    await createFixtures();

    const raw = rawPayment({
      id: "pay_stage7_a",
      providerEventId: eventIds[0],
      subscription: "sub_stage7_a",
      checkoutSession: "checkout_stage7_a",
    });
    const deliveries = await Promise.all(Array.from({ length: 10 }, () => ingest(raw)));
    assert.equal(new Set(deliveries.map((delivery) => delivery.eventId)).size, 1);
    assert.equal(deliveries.filter((delivery) => !delivery.duplicate).length, 1);
    const processing = await Promise.allSettled(
      Array.from({ length: 10 }, () => processBillingWebhookEventWithClient(prisma, deliveries[0].eventId)),
    );
    assert.equal(processing.filter((result) => result.status === "rejected").length, 0);
    assert.equal(await prisma.billingCharge.count({ where: { providerChargeId: "pay_stage7_a" } }), 1);
    assert.equal(
      (await prisma.subscription.findUniqueOrThrow({ where: { id: fixture.subscriptionA } })).status,
      "ACTIVE",
    );
    assert.equal(
      (await prisma.billingCheckoutAttempt.findUniqueOrThrow({ where: { id: fixture.attemptA } })).status,
      "PAID",
    );
    const reconciliation = await reconcileCheckoutAttemptWithClient(prisma, {
      async listPaymentsByCheckout(providerCheckoutId: string) {
        return [{
          id: "pay_stage7_a",
          status: "CONFIRMED",
          subscriptionId: "sub_stage7_a",
          checkoutId: providerCheckoutId,
          amountMinor: 12_990,
          dueDate: "2026-08-27",
          paymentDate: null,
          confirmedDate: "2026-08-27",
        }];
      },
    }, {
      organizationId: fixture.organizationA,
      attemptId: fixture.attemptA,
      actorUserId: fixture.userA,
      now: new Date("2026-08-27T12:05:00.000Z"),
    });
    assert.deepEqual(reconciliation, { status: "RECONCILED", payments: 1 });
    assert.equal(await prisma.billingCharge.count({ where: { providerChargeId: "pay_stage7_a" } }), 1);

    const oldEvent = await ingest(rawPayment({
      id: "pay_stage7_a",
      providerEventId: eventIds[1],
      subscription: "sub_stage7_a",
      event: "PAYMENT_CREATED",
    }));
    await processBillingWebhookEventWithClient(prisma, oldEvent.eventId);
    assert.equal(
      (await prisma.billingCharge.findUniqueOrThrow({ where: { providerChargeId: "pay_stage7_a" } })).status,
      "CONFIRMED",
    );

    const replayEvent = await ingest(rawPayment({
      id: "pay_stage7_b",
      providerEventId: eventIds[2],
      subscription: "sub_stage7_replay",
    }));
    await assert.rejects(
      () => processBillingWebhookEventWithClient(prisma, replayEvent.eventId),
      (error) => error instanceof BillingWebhookProcessingError
        && error.code === "PAYMENT_SUBSCRIPTION_NOT_MAPPED",
    );
    assert.equal(
      (await prisma.billingWebhookEvent.findUniqueOrThrow({ where: { id: replayEvent.eventId } })).status,
      "FAILED",
    );
    await prisma.subscription.update({
      where: { id: fixture.subscriptionB },
      data: { providerSubscriptionId: "sub_stage7_replay" },
    });
    await processBillingWebhookEventWithClient(prisma, replayEvent.eventId);
    assert.equal(
      (await prisma.billingWebhookEvent.findUniqueOrThrow({ where: { id: replayEvent.eventId } })).status,
      "PROCESSED",
    );

    const unknownRaw = JSON.stringify({ id: eventIds[3], event: "FUTURE_EVENT", addedLater: true });
    const unknown = await ingest(unknownRaw);
    await processBillingWebhookEventWithClient(prisma, unknown.eventId);
    assert.equal(
      (await prisma.billingWebhookEvent.findUniqueOrThrow({ where: { id: unknown.eventId } })).status,
      "IGNORED",
    );

    console.log(JSON.stringify({
      target: "127.0.0.1:54329/calculadora_nutricional",
      duplicateDeliveries: deliveries.length,
      uniqueInboxRows: 1,
      uniqueFinancialEffects: 1,
      concurrentProcessingRejected: 0,
      outOfOrderDidNotRegress: true,
      failedEventReprocessed: true,
      providerReconciliationIdempotent: true,
      unknownEventIgnored: true,
      subscriptionActivatedOnlyByPayment: true,
    }));
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Falha no smoke de webhooks.");
  process.exitCode = 1;
});
