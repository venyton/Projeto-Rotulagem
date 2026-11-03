import assert from "node:assert/strict";

import { PrismaClient } from "@prisma/client";

import type { BillingProvider } from "../src/features/billing/domain/billing-provider";
import { startRecurringCheckoutWithClient } from "../src/features/billing/persistence/checkout-core";
import { redeemCouponForSubscriptionWithClient } from "../src/features/commercial-catalog/persistence/coupon-redemption-core";
import { resolveFeatureEntitlement } from "../src/features/saas/domain/feature-entitlement";

const databaseUrl = process.env.POSTGRES_PRISMA_URL ?? "";
const parsedUrl = new URL(databaseUrl);
if (!(parsedUrl.hostname === "127.0.0.1" && parsedUrl.port === "54329")) throw new Error("Smoke comercial recusado: use somente 127.0.0.1:54329.");

const prisma = new PrismaClient();
const ids = {
  users: ["stage9-user-a", "stage9-user-b"], organizations: ["stage9-org-a", "stage9-org-b"],
  plan: "stage9-plan", version: "stage9-version", price: "stage9-price",
  subscriptions: ["stage9-sub-a", "stage9-sub-b"], coupons: ["stage9-coupon-race", "stage9-coupon-checkout"],
};

async function cleanup() {
  await prisma.billingCharge.deleteMany({ where: { organizationId: { in: ids.organizations } } });
  await prisma.billingCheckoutAttempt.deleteMany({ where: { organizationId: { in: ids.organizations } } });
  await prisma.couponRedemption.deleteMany({ where: { organizationId: { in: ids.organizations } } });
  await prisma.subscription.deleteMany({ where: { organizationId: { in: ids.organizations } } });
  await prisma.commercialCouponPlan.deleteMany({ where: { couponId: { in: ids.coupons } } });
  await prisma.commercialCoupon.deleteMany({ where: { id: { in: ids.coupons } } });
  await prisma.commercialGrant.deleteMany({ where: { organizationId: { in: ids.organizations } } });
  await prisma.billingCustomer.deleteMany({ where: { organizationId: { in: ids.organizations } } });
  await prisma.securityAuditLog.deleteMany({ where: { organizationId: { in: ids.organizations } } });
  await prisma.organizationMember.deleteMany({ where: { organizationId: { in: ids.organizations } } });
  await prisma.organization.deleteMany({ where: { id: { in: ids.organizations } } });
  await prisma.$executeRawUnsafe('ALTER TABLE "BillingPrice" DISABLE TRIGGER USER');
  await prisma.$executeRawUnsafe('ALTER TABLE "PlanVersionFeature" DISABLE TRIGGER USER');
  await prisma.$executeRawUnsafe('ALTER TABLE "PlanVersion" DISABLE TRIGGER USER');
  await prisma.billingPrice.deleteMany({ where: { id: ids.price } });
  await prisma.planVersionFeature.deleteMany({ where: { planVersionId: ids.version } });
  await prisma.planVersion.deleteMany({ where: { id: ids.version } });
  await prisma.plan.deleteMany({ where: { id: ids.plan } });
  await prisma.$executeRawUnsafe('ALTER TABLE "BillingPrice" ENABLE TRIGGER USER');
  await prisma.$executeRawUnsafe('ALTER TABLE "PlanVersionFeature" ENABLE TRIGGER USER');
  await prisma.$executeRawUnsafe('ALTER TABLE "PlanVersion" ENABLE TRIGGER USER');
  await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
}

async function main() {
  try {
    await cleanup();
    await prisma.user.createMany({ data: [
      { id: ids.users[0], email: "stage9-a@example.test" }, { id: ids.users[1], email: "stage9-b@example.test" },
    ] });
    await prisma.organization.createMany({ data: [
      { id: ids.organizations[0], ownerId: ids.users[0], name: "Stage 9 A", slug: "stage9-a" },
      { id: ids.organizations[1], ownerId: ids.users[1], name: "Stage 9 B", slug: "stage9-b" },
    ] });
    const feature = await prisma.featureDefinition.findUniqueOrThrow({ where: { key: "tables" } });
    await prisma.plan.create({ data: { id: ids.plan, code: "STAGE9", name: "Stage 9", status: "ACTIVE", active: true } });
    await prisma.planVersion.create({ data: { id: ids.version, planId: ids.plan, versionNumber: 1, status: "DRAFT", features: { create: { featureDefinitionId: feature.id, enabled: true } } } });
    await prisma.planVersion.update({ where: { id: ids.version }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    await prisma.billingPrice.create({ data: { id: ids.price, planVersionId: ids.version, amountMinor: 10_000, currency: "BRL", billingInterval: "MONTHLY", status: "ACTIVE" } });
    await prisma.subscription.createMany({ data: ids.subscriptions.map((id, index) => ({ id, organizationId: ids.organizations[index], planId: ids.plan, planVersionId: ids.version, billingPriceId: ids.price, provider: "MANUAL" as const, status: "INCOMPLETE" as const })) });
    await prisma.commercialCoupon.create({ data: { id: ids.coupons[0], codeNormalized: "RACE-ONE", name: "Race One", discountType: "PERCENT", discountValue: 1_000, startsAt: new Date(Date.now() - 60_000), endsAt: new Date(Date.now() + 3_600_000), maxRedemptions: 1, maxRedemptionsPerOrganization: 1, status: "ACTIVE", createdByUserId: ids.users[0], plans: { create: { planId: ids.plan } } } });

    const concurrent = await Promise.allSettled(ids.organizations.map((organizationId, index) => prisma.$transaction((tx) => redeemCouponForSubscriptionWithClient(tx, { code: "race-one", organizationId, subscriptionId: ids.subscriptions[index], planId: ids.plan, originalAmountMinor: 10_000, currency: "BRL", at: new Date() }))));
    assert.equal(concurrent.filter((item) => item.status === "fulfilled").length, 1);
    assert.equal(await prisma.couponRedemption.count({ where: { couponId: ids.coupons[0], revokedAt: null } }), 1);

    const startsAt = new Date(Date.now() - 60_000);
    const expiresAt = new Date(Date.now() + 60_000);
    const grant = await prisma.commercialGrant.create({ data: { organizationId: ids.organizations[0], sourceType: "COURTESY", reason: "Cortesia temporária do smoke local.", startsAt, expiresAt, createdByUserId: ids.users[0], features: { create: { featureDefinitionId: feature.id, enabled: true } } }, include: { features: true } });
    const entitlement = resolveFeatureEntitlement({ featureKey: feature.key, featureType: feature.type, moduleKey: feature.moduleKey, organizationStatus: "ACTIVE", policyVersion: 2, at: new Date(), overrides: [], grants: grant.features.map((item) => ({ id: grant.id, enabled: item.enabled, limitValue: item.limitValue, startsAt, expiresAt, createdAt: grant.createdAt })), planFeature: null, legacyModules: [] });
    assert.equal(entitlement.source, "GRANT");
    assert.equal(resolveFeatureEntitlement({ featureKey: feature.key, featureType: feature.type, moduleKey: feature.moduleKey, organizationStatus: "ACTIVE", policyVersion: 2, at: new Date(expiresAt.getTime() + 1), overrides: [], grants: grant.features.map((item) => ({ id: grant.id, enabled: item.enabled, limitValue: item.limitValue, startsAt, expiresAt, createdAt: grant.createdAt })), planFeature: null, legacyModules: [] }).source, "DEFAULT_DENY");

    await prisma.commercialCoupon.create({ data: { id: ids.coupons[1], codeNormalized: "CHECKOUT-20", name: "Checkout 20", discountType: "PERCENT", discountValue: 2_000, startsAt, endsAt: new Date(Date.now() + 3_600_000), maxRedemptionsPerOrganization: 1, status: "ACTIVE", createdByUserId: ids.users[0], plans: { create: { planId: ids.plan } } } });
    await prisma.billingCustomer.create({ data: { organizationId: ids.organizations[0], userId: ids.users[0], provider: "ASAAS", providerCustomerId: "cus_stage9", status: "ACTIVE" } });
    let providerAmount = 0;
    const provider = {
      name: "ASAAS",
      async createRecurringCheckout(input) { providerAmount = input.item.amountMinor; return { id: "checkout_stage9", link: "https://asaas.com/checkoutSession/show/stage9", status: "ACTIVE", externalReference: input.externalReference }; },
    } as BillingProvider;
    const checkout = await startRecurringCheckoutWithClient(prisma, provider, { organizationId: ids.organizations[0], actorUserId: ids.users[0], billingPriceId: ids.price, couponCode: "checkout-20", appOrigin: "http://localhost:3000", now: new Date() });
    const attempt = await prisma.billingCheckoutAttempt.findUniqueOrThrow({ where: { id: checkout.attemptId }, include: { couponRedemption: true } });
    assert.equal(providerAmount, 8_000);
    assert.equal(attempt.amountMinorSnapshot, 8_000);
    assert.equal(attempt.couponRedemption?.appliedDiscountMinor, 2_000);

    console.log(JSON.stringify({ target: "127.0.0.1:54329/calculadora_nutricional", concurrentRedemptions: 2, acceptedRedemptions: 1, discountSnapshotMinor: attempt.amountMinorSnapshot, providerReceivedMinor: providerAmount, commercialGrantResolved: true, expiredGrantIgnored: true }));
  } finally { await cleanup(); await prisma.$disconnect(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
