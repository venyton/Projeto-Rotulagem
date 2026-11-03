import "server-only";

import type { Prisma } from "@prisma/client";

import { resolveFeatureEntitlement } from "@/features/saas/domain/feature-entitlement";
import { ALL_SAAS_MODULES, type SaaSModuleKey } from "@/features/saas/domain/modules";
import { prisma } from "@/lib/prisma";

const moduleFeatureKey = new Map<SaaSModuleKey, string>(
  ALL_SAAS_MODULES.map((moduleKey) => [moduleKey, moduleKey.toLowerCase()]),
);

type EntitlementDatabase = Prisma.TransactionClient | typeof prisma;

export async function resolveOrganizationFeatureEntitlementsWithClient(
  database: EntitlementDatabase,
  organizationId: string,
) {
  const now = new Date();
  const organization = await database.organization.findUnique({
    where: { id: organizationId },
    select: {
      status: true,
      entitlementPolicyVersion: true,
      entitlements: {
        select: { moduleKey: true, enabled: true, usageLimit: true, expiresAt: true },
      },
      featureGrants: {
        where: { startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        select: {
          id: true,
          featureDefinitionId: true,
          enabled: true,
          limitValue: true,
          startsAt: true,
          expiresAt: true,
          createdAt: true,
        },
      },
      commercialGrants: {
        where: {
          revokedAt: null,
          startsAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        select: {
          id: true,
          startsAt: true,
          expiresAt: true,
          createdAt: true,
          features: {
            select: { featureDefinitionId: true, enabled: true, limitValue: true },
          },
        },
      },
      featureOverrides: {
        where: { startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        select: {
          id: true,
          featureDefinitionId: true,
          mode: true,
          limitValue: true,
          startsAt: true,
          expiresAt: true,
          createdAt: true,
        },
      },
      subscriptions: {
        where: {
          status: { in: ["ACTIVE", "TRIALING"] },
          planVersionId: { not: null },
        },
        orderBy: { updatedAt: "desc" },
        select: {
          status: true,
          trialEndsAt: true,
          currentPeriodEnd: true,
          planVersion: {
            select: {
              status: true,
              features: {
                select: {
                  featureDefinitionId: true,
                  enabled: true,
                  limitValue: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!organization) return null;

  const featureDefinitions = await database.featureDefinition.findMany({
    where: { isActive: true },
    select: { id: true, key: true, type: true, moduleKey: true },
  });
  const subscription = organization.subscriptions.find((candidate) =>
    candidate.planVersion?.status === "PUBLISHED"
      && (candidate.status !== "TRIALING"
        || candidate.trialEndsAt === null
        || candidate.trialEndsAt.getTime() > now.getTime()),
  ) ?? null;
  const planFeatures = new Map(
    subscription?.planVersion?.features.map((feature) => [feature.featureDefinitionId, feature]) ?? [],
  );
  const validUntil = subscription?.status === "TRIALING"
    ? subscription.trialEndsAt
    : subscription?.currentPeriodEnd ?? null;

  return featureDefinitions.map((feature) => resolveFeatureEntitlement({
    featureKey: feature.key,
    featureType: feature.type,
    moduleKey: feature.moduleKey,
    organizationStatus: organization.status,
    policyVersion: organization.entitlementPolicyVersion,
    at: now,
    overrides: organization.featureOverrides.filter((item) => item.featureDefinitionId === feature.id),
    grants: [
      ...organization.featureGrants.filter((item) => item.featureDefinitionId === feature.id),
      ...organization.commercialGrants.flatMap((grant) => grant.features
        .filter((item) => item.featureDefinitionId === feature.id)
        .map((item) => ({
          id: `commercial:${grant.id}`,
          enabled: item.enabled,
          limitValue: item.limitValue,
          startsAt: grant.startsAt,
          expiresAt: grant.expiresAt,
          createdAt: grant.createdAt,
        }))),
    ],
    planFeature: planFeatures.has(feature.id)
      ? { ...planFeatures.get(feature.id)!, validUntil }
      : null,
    legacyModules: organization.entitlements,
  }));
}

export function resolveOrganizationFeatureEntitlements(organizationId: string) {
  return resolveOrganizationFeatureEntitlementsWithClient(prisma, organizationId);
}

export async function resolveOrganizationModuleEntitlements(organizationId: string) {
  const features = await resolveOrganizationFeatureEntitlements(organizationId);
  if (!features) return [];

  return ALL_SAAS_MODULES.map((moduleKey) => {
    const featureKey = moduleFeatureKey.get(moduleKey)!;
    const feature = features.find((item) => item.featureKey === featureKey);
    return {
      moduleKey,
      enabled: feature?.enabled ?? false,
      usageLimit: feature?.limit ?? null,
      expiresAt: feature?.validUntil ?? null,
      source: feature?.source ?? "DEFAULT_DENY",
      reasonCode: feature?.reasonCode ?? "not_entitled",
    };
  });
}

export async function requireOrganizationFeatureEntitlement(organizationId: string, featureKey: string) {
  const entitlements = await resolveOrganizationFeatureEntitlements(organizationId);
  const entitlement = entitlements?.find((item) => item.featureKey === featureKey);
  if (!entitlement?.enabled) {
    throw new Error("Feature não liberada para esta organização.");
  }
  return entitlement;
}
