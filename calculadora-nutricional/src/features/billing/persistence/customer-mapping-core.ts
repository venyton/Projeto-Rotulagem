import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

import { BillingProviderError, type BillingProvider } from "../domain/billing-provider";
import {
  validateCustomerMappingInput,
  type CustomerMappingInput,
} from "../domain/customer-mapping";

const MAPPING_LEASE_MS = 30_000;
type BillingDatabase = Pick<PrismaClient, "billingCustomer" | "securityAuditLog" | "$transaction">;

export class BillingCustomerMappingError extends Error {
  constructor(public code: "IN_PROGRESS" | "LEASE_LOST" | "PERSISTENCE_CONFLICT") {
    super(`Customer mapping indisponível: ${code}.`);
    this.name = "BillingCustomerMappingError";
  }
}

export async function ensureAsaasCustomerMappingWithClient(
  database: BillingDatabase,
  rawInput: CustomerMappingInput,
  provider: BillingProvider,
) {
  const input = validateCustomerMappingInput(rawInput);
  const current = await database.billingCustomer.findUnique({
    where: { organizationId_provider: { organizationId: input.organizationId, provider: "ASAAS" } },
  });
  if (current?.status === "ACTIVE" && current.providerCustomerId) {
    return { mapping: current, source: "local" as const };
  }

  const now = new Date();
  const leaseId = randomUUID();
  const leaseExpiresAt = new Date(now.getTime() + MAPPING_LEASE_MS);
  const candidate = await database.billingCustomer.upsert({
    where: { organizationId_provider: { organizationId: input.organizationId, provider: "ASAAS" } },
    create: {
      organizationId: input.organizationId,
      userId: input.actorUserId,
      provider: "ASAAS",
      externalReference: input.organizationId,
      status: "PENDING",
      syncLeaseId: leaseId,
      syncLeaseExpiresAt: leaseExpiresAt,
      email: input.email,
    },
    update: {},
  });
  const claimed = await database.billingCustomer.updateMany({
    where: {
      id: candidate.id,
      status: { not: "ACTIVE" },
      OR: [
        { syncLeaseId: leaseId },
        { syncLeaseId: null },
        { syncLeaseExpiresAt: { lt: now } },
      ],
    },
    data: {
      status: "PENDING",
      syncLeaseId: leaseId,
      syncLeaseExpiresAt: leaseExpiresAt,
      lastErrorCode: null,
      userId: input.actorUserId,
      email: input.email,
      externalReference: input.organizationId,
    },
  });
  if (claimed.count !== 1) {
    const raced = await database.billingCustomer.findUnique({ where: { id: candidate.id } });
    if (raced?.status === "ACTIVE" && raced.providerCustomerId) {
      return { mapping: raced, source: "local" as const };
    }
    throw new BillingCustomerMappingError("IN_PROGRESS");
  }

  try {
    const existing = await provider.findCustomerByExternalReference(input.organizationId);
    if (existing) {
      const mapping = await finalizeMapping(database, candidate.id, leaseId, existing.id, input, "remote_existing");
      return { mapping, source: "remote_existing" as const };
    }

    try {
      const created = await provider.createCustomer({
        externalReference: input.organizationId,
        name: input.name,
        cpfCnpj: input.cpfCnpj,
        email: input.email,
        mobilePhone: input.mobilePhone,
      });
      const mapping = await finalizeMapping(database, candidate.id, leaseId, created.id, input, "remote_created");
      return { mapping, source: "remote_created" as const };
    } catch (error) {
      if (error instanceof BillingProviderError && error.outcomeUnknown) {
        const reconciled = await provider.findCustomerByExternalReference(input.organizationId);
        if (reconciled) {
          const mapping = await finalizeMapping(
            database,
            candidate.id,
            leaseId,
            reconciled.id,
            input,
            "remote_reconciled",
          );
          return { mapping, source: "remote_reconciled" as const };
        }
      }
      throw error;
    }
  } catch (error) {
    const errorCode = error instanceof BillingProviderError ? error.code : "MAPPING_FAILED";
    await database.billingCustomer.updateMany({
      where: { id: candidate.id, syncLeaseId: leaseId },
      data: {
        status: "SYNC_ERROR",
        syncLeaseId: null,
        syncLeaseExpiresAt: null,
        lastErrorCode: errorCode,
      },
    });
    throw error;
  }
}

async function finalizeMapping(
  database: BillingDatabase,
  mappingId: string,
  leaseId: string,
  providerCustomerId: string,
  input: ReturnType<typeof validateCustomerMappingInput>,
  source: "remote_existing" | "remote_created" | "remote_reconciled",
) {
  try {
    return await database.$transaction(async (tx) => {
      const updated = await tx.billingCustomer.updateMany({
        where: { id: mappingId, syncLeaseId: leaseId },
        data: {
          providerCustomerId,
          status: "ACTIVE",
          syncLeaseId: null,
          syncLeaseExpiresAt: null,
          lastSyncedAt: new Date(),
          lastErrorCode: null,
          email: input.email,
          metadata: { mappingSource: source },
        },
      });
      if (updated.count !== 1) throw new BillingCustomerMappingError("LEASE_LOST");
      await tx.securityAuditLog.create({
        data: {
          organizationId: input.organizationId,
          userId: input.actorUserId,
          action: "billing.customer.mapped",
          riskLevel: "INFO",
          actorType: input.actorUserId ? "USER" : "SYSTEM",
          targetType: "BillingCustomer",
          targetId: mappingId,
          metadata: { provider: "ASAAS", source },
        },
      });
      return tx.billingCustomer.findUniqueOrThrow({ where: { id: mappingId } });
    });
  } catch (error) {
    if (error instanceof BillingCustomerMappingError) throw error;
    throw new BillingCustomerMappingError("PERSISTENCE_CONFLICT");
  }
}
