export type DiscountType = "PERCENT" | "FIXED";

export class CommercialBenefitError extends Error {
  constructor(public code:
    | "INVALID_CODE"
    | "INVALID_VALUE"
    | "INVALID_VALIDITY"
    | "NOT_ACTIVE"
    | "NOT_APPLICABLE"
    | "USAGE_EXHAUSTED"
    | "INVALID_REASON"
    | "INVALID_FEATURES") {
    super(`Benefício comercial inválido: ${code}.`);
    this.name = "CommercialBenefitError";
  }
}

export function normalizeCouponCode(value: unknown) {
  if (typeof value !== "string") throw new CommercialBenefitError("INVALID_CODE");
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z0-9]+(?:[-_][A-Z0-9]+)*$/.test(normalized) || normalized.length < 3 || normalized.length > 40) {
    throw new CommercialBenefitError("INVALID_CODE");
  }
  return normalized;
}

export function parsePercentToBasisPoints(value: unknown) {
  if (typeof value !== "string") throw new CommercialBenefitError("INVALID_VALUE");
  const match = value.trim().replace(",", ".").match(/^(\d{1,2})(?:\.(\d{1,2}))?$/);
  if (!match) throw new CommercialBenefitError("INVALID_VALUE");
  const basisPoints = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (basisPoints < 1 || basisPoints > 9_900) throw new CommercialBenefitError("INVALID_VALUE");
  return basisPoints;
}

export function calculateDiscount(input: {
  originalAmountMinor: number;
  discountType: DiscountType;
  discountValue: number;
  currency: string | null;
}) {
  if (!Number.isSafeInteger(input.originalAmountMinor) || input.originalAmountMinor <= 1) {
    throw new CommercialBenefitError("INVALID_VALUE");
  }
  let appliedDiscountMinor: number;
  if (input.discountType === "PERCENT") {
    if (!Number.isSafeInteger(input.discountValue) || input.discountValue < 1 || input.discountValue > 9_900 || input.currency !== null) {
      throw new CommercialBenefitError("INVALID_VALUE");
    }
    appliedDiscountMinor = Math.floor((input.originalAmountMinor * input.discountValue) / 10_000);
  } else {
    if (!Number.isSafeInteger(input.discountValue) || input.discountValue <= 0 || input.currency !== "BRL") {
      throw new CommercialBenefitError("INVALID_VALUE");
    }
    appliedDiscountMinor = input.discountValue;
  }
  if (appliedDiscountMinor <= 0 || appliedDiscountMinor >= input.originalAmountMinor) {
    throw new CommercialBenefitError("INVALID_VALUE");
  }
  return {
    originalAmountMinor: input.originalAmountMinor,
    appliedDiscountMinor,
    finalAmountMinor: input.originalAmountMinor - appliedDiscountMinor,
  };
}

export function assertCouponRedeemable(input: {
  status: string;
  startsAt: Date;
  endsAt: Date;
  at: Date;
  appliesToPlan: boolean;
  activeRedemptions: number;
  organizationRedemptions: number;
  maxRedemptions: number | null;
  maxRedemptionsPerOrganization: number;
}) {
  if (input.endsAt.getTime() <= input.startsAt.getTime()) throw new CommercialBenefitError("INVALID_VALIDITY");
  if (input.status !== "ACTIVE" || input.startsAt > input.at || input.endsAt <= input.at) {
    throw new CommercialBenefitError("NOT_ACTIVE");
  }
  if (!input.appliesToPlan) throw new CommercialBenefitError("NOT_APPLICABLE");
  if (
    (input.maxRedemptions !== null && input.activeRedemptions >= input.maxRedemptions)
    || input.organizationRedemptions >= input.maxRedemptionsPerOrganization
  ) {
    throw new CommercialBenefitError("USAGE_EXHAUSTED");
  }
}

export function validateCommercialGrant(input: {
  reason: unknown;
  startsAt: Date;
  expiresAt: Date | null;
  featureCount: number;
}) {
  const reason = typeof input.reason === "string" ? input.reason.trim().replace(/\s+/g, " ") : "";
  if (reason.length < 12 || reason.length > 500) throw new CommercialBenefitError("INVALID_REASON");
  if (input.expiresAt && input.expiresAt <= input.startsAt) throw new CommercialBenefitError("INVALID_VALIDITY");
  if (!Number.isSafeInteger(input.featureCount) || input.featureCount < 1 || input.featureCount > 50) {
    throw new CommercialBenefitError("INVALID_FEATURES");
  }
  return { reason, permanent: input.expiresAt === null };
}
