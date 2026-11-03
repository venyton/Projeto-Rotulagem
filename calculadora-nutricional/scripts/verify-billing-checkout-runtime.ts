import assert from "node:assert/strict";

import { PrismaClient } from "@prisma/client";

import {
  BillingProviderError,
  type BillingProvider,
  type BillingProviderCheckout,
  type BillingProviderCustomer,
  type BillingProviderCustomerInput,
  type BillingProviderRecurringCheckoutInput,
} from "../src/features/billing/domain/billing-provider";
import {
  BillingCheckoutError,
  cancelCheckoutWithClient,
  startRecurringCheckoutWithClient,
  verifyCheckoutReturnWithClient,
} from "../src/features/billing/persistence/checkout-core";

const databaseUrl = process.env.POSTGRES_PRISMA_URL ?? "";
const parsedUrl = new URL(databaseUrl);
if (!(parsedUrl.hostname === "127.0.0.1" && parsedUrl.port === "54329")) {
  throw new Error("Smoke de checkout recusado: use somente 127.0.0.1:54329.");
}

const prisma = new PrismaClient();
const fixture = {
  userA: "stage6-checkout-user-a",
  userB: "stage6-checkout-user-b",
  organizationA: "stage6-checkout-org-a",
  organizationB: "stage6-checkout-org-b",
  plan: "stage6-checkout-plan",
  version: "stage6-checkout-version",
  price: "stage6-checkout-price",
};

class CheckoutFakeProvider implements BillingProvider {
  readonly name = "ASAAS" as const;
  customer: BillingProviderCustomer | null = null;
  checkoutCalls = 0;
  cancelCalls = 0;

  async diagnostic() {
    return {
      provider: "ASAAS" as const,
      environment: "sandbox" as const,
      configured: true,
      status: "reachable" as const,
      baseHost: "fake.local",
      latencyMs: 0,
      errorCode: null,
    };
  }

  async findCustomerByExternalReference(externalReference: string) {
    return this.customer?.externalReference === externalReference ? this.customer : null;
  }

  async createCustomer(input: BillingProviderCustomerInput) {
    this.customer = {
      id: `cus_${input.externalReference.replace(/[^A-Za-z0-9]/g, "")}`,
      externalReference: input.externalReference,
      name: input.name,
      email: input.email ?? null,
      deleted: false,
    };
    return this.customer;
  }

  async retrieveCustomer() {
    assert.ok(this.customer);
    return this.customer;
  }

  async createRecurringCheckout(input: BillingProviderRecurringCheckoutInput): Promise<BillingProviderCheckout> {
    this.checkoutCalls += 1;
    return {
      id: "checkout_stage6_created",
      link: "https://sandbox.asaas.com/checkoutSession/show/checkout_stage6_created",
      status: "ACTIVE",
      externalReference: input.externalReference,
    };
  }

  async cancelCheckout(providerCheckoutId: string): Promise<BillingProviderCheckout> {
    this.cancelCalls += 1;
    return {
      id: providerCheckoutId,
      link: "https://sandbox.asaas.com/checkoutSession/show/checkout_stage6_created",
      status: "CANCELED",
      externalReference: "",
    };
  }
}

class AmbiguousCheckoutProvider extends CheckoutFakeProvider {
  override async createRecurringCheckout(): Promise<BillingProviderCheckout> {
    this.checkoutCalls += 1;
    throw new BillingProviderError("NETWORK_ERROR", { outcomeUnknown: true });
  }
}

async function cleanup() {
  const organizationIds = [fixture.organizationA, fixture.organizationB];
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
    { id: fixture.userA, email: "stage6-checkout-a@example.test" },
    { id: fixture.userB, email: "stage6-checkout-b@example.test" },
  ] });
  await prisma.organization.createMany({ data: [
    { id: fixture.organizationA, ownerId: fixture.userA, name: "Stage 6 A", slug: "stage6-checkout-a" },
    { id: fixture.organizationB, ownerId: fixture.userB, name: "Stage 6 B", slug: "stage6-checkout-b" },
  ] });
  await prisma.plan.upsert({
    where: { id: fixture.plan },
    create: { id: fixture.plan, code: "STAGE6_CHECKOUT", name: "Plano Stage 6", status: "ACTIVE", active: true },
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
}

function checkoutInput(organizationId: string, actorUserId: string) {
  return {
    organizationId,
    actorUserId,
    billingPriceId: fixture.price,
    cpfCnpj: "52998224725",
    email: `${actorUserId}@example.test`,
    appOrigin: "http://127.0.0.1:3000",
    now: new Date("2026-08-27T12:00:00.000Z"),
  };
}

async function main() {
  try {
    await cleanup();
    await createFixtures();

    const provider = new CheckoutFakeProvider();
    const created = await startRecurringCheckoutWithClient(
      prisma,
      provider,
      checkoutInput(fixture.organizationA, fixture.userA),
    );
    assert.equal(created.source, "created");
    assert.equal(provider.checkoutCalls, 1);

    const reused = await startRecurringCheckoutWithClient(
      prisma,
      provider,
      checkoutInput(fixture.organizationA, fixture.userA),
    );
    assert.equal(reused.source, "existing");
    assert.equal(reused.attemptId, created.attemptId);
    assert.equal(provider.checkoutCalls, 1);

    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { organizationId: fixture.organizationA },
    });
    assert.equal(subscription.status, "INCOMPLETE");
    assert.equal(await prisma.billingCharge.count({ where: { organizationId: fixture.organizationA } }), 0);
    assert.equal(await verifyCheckoutReturnWithClient(prisma, {
      organizationId: fixture.organizationA,
      attemptId: created.attemptId,
      state: "invalid-callback-state",
    }), false);

    await assert.rejects(
      () => cancelCheckoutWithClient(prisma, provider, {
        organizationId: fixture.organizationB,
        actorUserId: fixture.userB,
        attemptId: created.attemptId,
      }),
      (error) => error instanceof BillingCheckoutError && error.code === "NOT_FOUND",
    );
    assert.equal(provider.cancelCalls, 0);

    await cancelCheckoutWithClient(prisma, provider, {
      organizationId: fixture.organizationA,
      actorUserId: fixture.userA,
      attemptId: created.attemptId,
    });
    assert.equal(provider.cancelCalls, 1);
    assert.equal(
      (await prisma.billingCheckoutAttempt.findUniqueOrThrow({ where: { id: created.attemptId } })).status,
      "CANCELED",
    );

    const ambiguousProvider = new AmbiguousCheckoutProvider();
    await assert.rejects(
      () => startRecurringCheckoutWithClient(
        prisma,
        ambiguousProvider,
        checkoutInput(fixture.organizationB, fixture.userB),
      ),
      (error) => error instanceof BillingCheckoutError && error.code === "RECONCILIATION_REQUIRED",
    );
    assert.equal(ambiguousProvider.checkoutCalls, 1);
    assert.equal(
      (await prisma.billingCheckoutAttempt.findFirstOrThrow({
        where: { organizationId: fixture.organizationB },
      })).status,
      "OUTCOME_UNKNOWN",
    );
    await assert.rejects(
      () => startRecurringCheckoutWithClient(
        prisma,
        ambiguousProvider,
        checkoutInput(fixture.organizationB, fixture.userB),
      ),
      (error) => error instanceof BillingCheckoutError && error.code === "RECONCILIATION_REQUIRED",
    );
    assert.equal(ambiguousProvider.checkoutCalls, 1);

    console.log(JSON.stringify({
      target: "127.0.0.1:54329/calculadora_nutricional",
      checkoutCreateCalls: provider.checkoutCalls,
      reusedAttempt: reused.attemptId === created.attemptId,
      crossTenantCancelDenied: provider.cancelCalls === 1,
      subscriptionStatusBeforeWebhook: subscription.status,
      chargeCountBeforeWebhook: 0,
      ambiguousCheckoutCalls: ambiguousProvider.checkoutCalls,
      ambiguousRetryBlocked: true,
    }));
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Falha no smoke de checkout.");
  process.exitCode = 1;
});
