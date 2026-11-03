import assert from "node:assert/strict";
import test from "node:test";

import {
  assertCouponRedeemable,
  calculateDiscount,
  CommercialBenefitError,
  normalizeCouponCode,
  parsePercentToBasisPoints,
  validateCommercialGrant,
} from "./commercial-benefits";

test("normaliza cupom de forma determinística e case-insensitive", () => {
  assert.equal(normalizeCouponCode("  piloto-2026 "), "PILOTO-2026");
  assert.throws(() => normalizeCouponCode("cupom com espaço"));
  assert.throws(() => normalizeCouponCode("áéí"));
});

test("calcula desconto percentual em centavos sem ponto flutuante autoritativo", () => {
  assert.equal(parsePercentToBasisPoints("15,25"), 1_525);
  assert.deepEqual(calculateDiscount({ originalAmountMinor: 12_999, discountType: "PERCENT", discountValue: 1_500, currency: null }), {
    originalAmountMinor: 12_999,
    appliedDiscountMinor: 1_949,
    finalAmountMinor: 11_050,
  });
});

test("desconto fixo não pode zerar ou inverter o preço", () => {
  assert.deepEqual(calculateDiscount({ originalAmountMinor: 10_000, discountType: "FIXED", discountValue: 2_500, currency: "BRL" }).finalAmountMinor, 7_500);
  assert.throws(() => calculateDiscount({ originalAmountMinor: 10_000, discountType: "FIXED", discountValue: 10_000, currency: "BRL" }));
});

test("validade, plano e limites são avaliados antes do redemption", () => {
  const baseline = { status: "ACTIVE", startsAt: new Date("2026-01-01"), endsAt: new Date("2027-01-01"), at: new Date("2026-08-27"), appliesToPlan: true, activeRedemptions: 0, organizationRedemptions: 0, maxRedemptions: 10, maxRedemptionsPerOrganization: 1 };
  assert.doesNotThrow(() => assertCouponRedeemable(baseline));
  assert.throws(() => assertCouponRedeemable({ ...baseline, organizationRedemptions: 1 }), (error) => error instanceof CommercialBenefitError && error.code === "USAGE_EXHAUSTED");
  assert.throws(() => assertCouponRedeemable({ ...baseline, appliesToPlan: false }), (error) => error instanceof CommercialBenefitError && error.code === "NOT_APPLICABLE");
});

test("grant permanente é explícito e toda concessão exige motivo e feature", () => {
  assert.deepEqual(validateCommercialGrant({ reason: "Cortesia aprovada para piloto.", startsAt: new Date(), expiresAt: null, featureCount: 1 }).permanent, true);
  assert.throws(() => validateCommercialGrant({ reason: "curto", startsAt: new Date(), expiresAt: null, featureCount: 1 }));
  assert.throws(() => validateCommercialGrant({ reason: "Cortesia aprovada para piloto.", startsAt: new Date(), expiresAt: null, featureCount: 0 }));
});
