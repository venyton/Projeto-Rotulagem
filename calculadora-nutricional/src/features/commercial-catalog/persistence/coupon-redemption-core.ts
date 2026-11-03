import type { Prisma } from "@prisma/client";

import {
  assertCouponRedeemable,
  calculateDiscount,
  normalizeCouponCode,
} from "@/features/commercial-catalog/domain/commercial-benefits";

export async function redeemCouponForSubscriptionWithClient(
  tx: Prisma.TransactionClient,
  input: {
    code: string;
    organizationId: string;
    subscriptionId: string;
    planId: string;
    originalAmountMinor: number;
    currency: string;
    at: Date;
  },
) {
  const codeNormalized = normalizeCouponCode(input.code);
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'soizi:coupon:' + codeNormalized}))::text AS lock`;
  const coupon = await tx.commercialCoupon.findUnique({
    where: { codeNormalized },
    select: {
      id: true,
      status: true,
      discountType: true,
      discountValue: true,
      currency: true,
      startsAt: true,
      endsAt: true,
      maxRedemptions: true,
      maxRedemptionsPerOrganization: true,
      plans: { where: { planId: input.planId }, select: { planId: true } },
      _count: { select: { redemptions: { where: { revokedAt: null } } } },
    },
  });
  if (!coupon) {
    assertCouponRedeemable({
      status: "MISSING", startsAt: input.at, endsAt: new Date(input.at.getTime() + 1), at: input.at,
      appliesToPlan: false, activeRedemptions: 0, organizationRedemptions: 0,
      maxRedemptions: null, maxRedemptionsPerOrganization: 1,
    });
    throw new Error("Cupom não encontrado.");
  }
  const organizationRedemptions = await tx.couponRedemption.count({
    where: { couponId: coupon.id, organizationId: input.organizationId, revokedAt: null },
  });
  assertCouponRedeemable({
    status: coupon.status,
    startsAt: coupon.startsAt,
    endsAt: coupon.endsAt,
    at: input.at,
    appliesToPlan: coupon.plans.length > 0,
    activeRedemptions: coupon._count.redemptions,
    organizationRedemptions,
    maxRedemptions: coupon.maxRedemptions,
    maxRedemptionsPerOrganization: coupon.maxRedemptionsPerOrganization,
  });
  if (input.currency !== "BRL") throw new Error("Moeda não suportada para cupom.");
  const amounts = calculateDiscount({
    originalAmountMinor: input.originalAmountMinor,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    currency: coupon.currency,
  });
  const redemption = await tx.couponRedemption.create({
    data: {
      couponId: coupon.id,
      organizationId: input.organizationId,
      subscriptionId: input.subscriptionId,
      ...amounts,
      currency: input.currency,
    },
    select: { id: true, appliedDiscountMinor: true, finalAmountMinor: true },
  });
  return { couponId: coupon.id, codeNormalized, ...redemption };
}
