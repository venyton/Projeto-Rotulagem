export type LimitDecision = {
  allowed: boolean;
  limit: number | null;
  usage: number;
  requested: number;
  remaining: number | null;
  reason: "not_entitled" | "unlimited" | "within_limit" | "limit_exceeded";
};

export function evaluateEntitlementLimit(input: {
  enabled: boolean;
  limit: number | null;
  usage: number;
  requested?: number;
}): LimitDecision {
  const requested = input.requested ?? 1;
  if (
    !Number.isSafeInteger(input.usage)
    || input.usage < 0
    || !Number.isSafeInteger(requested)
    || requested <= 0
  ) {
    throw new Error("Uso e quantidade solicitada devem ser inteiros válidos.");
  }
  if (!input.enabled) {
    return { allowed: false, limit: input.limit, usage: input.usage, requested, remaining: 0, reason: "not_entitled" };
  }
  if (input.limit === null) {
    return { allowed: true, limit: null, usage: input.usage, requested, remaining: null, reason: "unlimited" };
  }
  if (!Number.isSafeInteger(input.limit) || input.limit < 0) {
    throw new Error("Limite efetivo inválido.");
  }
  const remaining = Math.max(0, input.limit - input.usage);
  const allowed = input.usage + requested <= input.limit;
  return {
    allowed,
    limit: input.limit,
    usage: input.usage,
    requested,
    remaining,
    reason: allowed ? "within_limit" : "limit_exceeded",
  };
}

export function countBillableSeats(input: { activeMemberships: number; pendingInvitations: number }) {
  if (
    !Number.isSafeInteger(input.activeMemberships)
    || input.activeMemberships < 0
    || !Number.isSafeInteger(input.pendingInvitations)
    || input.pendingInvitations < 0
  ) {
    throw new Error("Contadores de seats inválidos.");
  }
  return input.activeMemberships + input.pendingInvitations;
}
