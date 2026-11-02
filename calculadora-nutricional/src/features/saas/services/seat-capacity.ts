import "server-only";

import type { Prisma } from "@prisma/client";

import { countBillableSeats, evaluateEntitlementLimit } from "@/features/saas/domain/limit-enforcement";
import { resolveOrganizationFeatureEntitlementsWithClient } from "@/features/saas/services/feature-entitlements";

export class SeatCapacityError extends Error {
  constructor(
    public code: "NOT_ENTITLED" | "LIMIT_EXCEEDED",
    public limit: number | null,
    public usage: number,
  ) {
    super(code === "NOT_ENTITLED" ? "Organização sem entitlement de seats." : "Limite de seats atingido.");
    this.name = "SeatCapacityError";
  }
}

export async function lockAndRequireSeatCapacity(
  tx: Prisma.TransactionClient,
  organizationId: string,
  requested = 1,
) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'soizi:seats:' + organizationId}))::text AS lock`;
  const now = new Date();
  const [entitlements, activeMemberships, pendingInvitations] = await Promise.all([
    resolveOrganizationFeatureEntitlementsWithClient(tx, organizationId),
    tx.organizationMember.count({ where: { organizationId, active: true } }),
    tx.organizationInvitation.count({
      where: { organizationId, status: "PENDING", expiresAt: { gt: now } },
    }),
  ]);
  const seats = entitlements?.find((item) => item.featureKey === "seats_max");
  const usage = countBillableSeats({ activeMemberships, pendingInvitations });
  const decision = evaluateEntitlementLimit({
    enabled: seats?.enabled ?? false,
    limit: seats?.limit ?? null,
    usage,
    requested,
  });
  if (!decision.allowed) {
    throw new SeatCapacityError(
      decision.reason === "not_entitled" ? "NOT_ENTITLED" : "LIMIT_EXCEEDED",
      decision.limit,
      decision.usage,
    );
  }
  return decision;
}
