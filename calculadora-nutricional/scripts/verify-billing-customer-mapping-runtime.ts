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
import { BillingCustomerMappingError, ensureAsaasCustomerMappingWithClient } from "../src/features/billing/persistence/customer-mapping-core";

const databaseUrl = process.env.POSTGRES_PRISMA_URL ?? "";
const parsedUrl = new URL(databaseUrl);
if (!(parsedUrl.hostname === "127.0.0.1" && parsedUrl.port === "54329")) {
  throw new Error("Smoke de billing recusado: use somente 127.0.0.1:54329.");
}

const prisma = new PrismaClient();
const fixtures = [
  { userId: "stage5-mapping-user-a", organizationId: "stage5-mapping-org-a", slug: "stage5-mapping-a" },
  { userId: "stage5-mapping-user-b", organizationId: "stage5-mapping-org-b", slug: "stage5-mapping-b" },
];

function customer(id: string, externalReference: string): BillingProviderCustomer {
  return { id, externalReference, name: "SoIZI Runtime", email: null, deleted: false };
}

class ConcurrentFakeProvider implements BillingProvider {
  readonly name = "ASAAS" as const;
  findCalls = 0;
  createCalls = 0;
  stored: BillingProviderCustomer | null = null;

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
    this.findCalls += 1;
    return this.stored?.externalReference === externalReference ? this.stored : null;
  }

  async createCustomer(input: BillingProviderCustomerInput) {
    this.createCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, 75));
    this.stored = customer("cus_stage5_concurrent", input.externalReference);
    return this.stored;
  }

  async retrieveCustomer() {
    return this.stored!;
  }

  async createRecurringCheckout(_input: BillingProviderRecurringCheckoutInput): Promise<BillingProviderCheckout> {
    throw new Error("Fora do escopo do verificador de customer mapping.");
  }

  async cancelCheckout(_providerCheckoutId: string): Promise<BillingProviderCheckout> {
    throw new Error("Fora do escopo do verificador de customer mapping.");
  }
}

class AmbiguousFakeProvider extends ConcurrentFakeProvider {
  override async createCustomer(input: BillingProviderCustomerInput): Promise<BillingProviderCustomer> {
    this.createCalls += 1;
    this.stored = customer("cus_stage5_reconciled", input.externalReference);
    throw new BillingProviderError("NETWORK_ERROR", { outcomeUnknown: true });
  }
}

async function cleanup() {
  const organizationIds = fixtures.map((fixture) => fixture.organizationId);
  await prisma.securityAuditLog.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await prisma.billingCustomer.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await prisma.organizationMember.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: organizationIds } } });
  await prisma.user.deleteMany({ where: { id: { in: fixtures.map((fixture) => fixture.userId) } } });
}

async function main() {
  try {
    await cleanup();
    for (const fixture of fixtures) {
      await prisma.user.create({ data: { id: fixture.userId, email: `${fixture.userId}@example.test` } });
      await prisma.organization.create({
        data: {
          id: fixture.organizationId,
          ownerId: fixture.userId,
          name: fixture.organizationId,
          slug: fixture.slug,
        },
      });
    }

    const provider = new ConcurrentFakeProvider();
    const input = {
      organizationId: fixtures[0].organizationId,
      actorUserId: fixtures[0].userId,
      name: "SoIZI Runtime A",
      cpfCnpj: "52998224725",
    };
    const concurrent = await Promise.allSettled([
      ensureAsaasCustomerMappingWithClient(prisma, input, provider),
      ensureAsaasCustomerMappingWithClient(prisma, input, provider),
    ]);
    assert.equal(concurrent.filter((result) => result.status === "fulfilled").length, 1);
    const rejected = concurrent.find((result) => result.status === "rejected");
    assert.ok(rejected?.status === "rejected");
    assert.ok(rejected.reason instanceof BillingCustomerMappingError);
    assert.equal(rejected.reason.code, "IN_PROGRESS");
    assert.equal(provider.createCalls, 1);
    const localRetry = await ensureAsaasCustomerMappingWithClient(prisma, input, provider);
    assert.equal(localRetry.source, "local");
    assert.equal(provider.createCalls, 1);

    const ambiguousProvider = new AmbiguousFakeProvider();
    const reconciled = await ensureAsaasCustomerMappingWithClient(prisma, {
      organizationId: fixtures[1].organizationId,
      actorUserId: fixtures[1].userId,
      name: "SoIZI Runtime B",
      cpfCnpj: "04252011000110",
    }, ambiguousProvider);
    assert.equal(reconciled.source, "remote_reconciled");
    assert.equal(ambiguousProvider.createCalls, 1);
    assert.equal(ambiguousProvider.findCalls, 2);

    console.log(JSON.stringify({
      target: "127.0.0.1:54329/calculadora_nutricional",
      concurrentCreateCalls: provider.createCalls,
      concurrentOutcomes: concurrent.map((result) => result.status).sort(),
      retrySource: localRetry.source,
      ambiguousPostSource: reconciled.source,
      sanitizedAuditEvents: await prisma.securityAuditLog.count({
        where: { organizationId: { in: fixtures.map((fixture) => fixture.organizationId) } },
      }),
    }));
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Falha no smoke de customer mapping.");
  process.exitCode = 1;
});
