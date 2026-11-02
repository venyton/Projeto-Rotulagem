import "server-only";

import { Prisma } from "@prisma/client";

import {
  CommercialBenefitError,
  normalizeCouponCode,
  validateCommercialGrant,
} from "@/features/commercial-catalog/domain/commercial-benefits";
import { PLATFORM_PERMISSIONS, type PlatformPermissionKey } from "@/features/platform-iam/domain/platform-authorization";
import { authorizePlatformRequest } from "@/features/platform-iam/services/platform-access";
import { authorizePrivilegedPlatformRequest } from "@/features/platform-iam/services/privileged-sessions";
import { prisma } from "@/lib/prisma";

export class CommercialManagementError extends Error {
  constructor(public code: "DENIED" | "NOT_FOUND" | "INVALID_INPUT" | "CONFLICT", message: string) {
    super(message);
    this.name = "CommercialManagementError";
  }
}

async function requirePermission(
  permission: PlatformPermissionKey,
  action: string,
  targetType: string,
  targetId?: string,
) {
  const authorize = permission === PLATFORM_PERMISSIONS.CATALOG_MANAGE
    ? authorizePlatformRequest
    : authorizePrivilegedPlatformRequest;
  const access = await authorize({ permission, action, targetType, targetId });
  if (!access.allowed || !access.user) throw new CommercialManagementError("DENIED", "Permissão insuficiente para esta operação.");
  return {
    ...access,
    privilegedSessionId: "privilegedSessionId" in access && typeof access.privilegedSessionId === "string"
      ? access.privilegedSessionId
      : null,
  };
}

export async function listCommercialBenefits() {
  const [coupons, grants, overrides, plans, features, organizations] = await Promise.all([
    prisma.commercialCoupon.findMany({
      orderBy: { createdAt: "desc" }, take: 100,
      select: {
        id: true, codeNormalized: true, name: true, discountType: true, discountValue: true, currency: true,
        startsAt: true, endsAt: true, maxRedemptions: true, maxRedemptionsPerOrganization: true, status: true,
        createdAt: true, createdByUser: { select: { email: true } }, plans: { select: { plan: { select: { id: true, name: true } } } },
        _count: { select: { redemptions: { where: { revokedAt: null } } } },
      },
    }),
    prisma.commercialGrant.findMany({
      orderBy: { createdAt: "desc" }, take: 100,
      select: {
        id: true, sourceType: true, reason: true, startsAt: true, expiresAt: true, revokedAt: true, createdAt: true,
        organization: { select: { id: true, name: true } }, createdByUser: { select: { email: true } },
        features: { select: { enabled: true, limitValue: true, featureDefinition: { select: { key: true, name: true, type: true } } } },
      },
    }),
    prisma.organizationFeatureOverride.findMany({
      orderBy: { createdAt: "desc" }, take: 100,
      select: {
        id: true, mode: true, limitValue: true, reason: true, startsAt: true, expiresAt: true, createdAt: true,
        organization: { select: { id: true, name: true } }, featureDefinition: { select: { key: true, name: true } },
        createdByUser: { select: { email: true } },
      },
    }),
    prisma.plan.findMany({ where: { active: true, status: "ACTIVE", versions: { some: { status: "PUBLISHED" } } }, orderBy: { name: "asc" }, select: { id: true, name: true, code: true } }),
    prisma.featureDefinition.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, key: true, name: true, type: true, unit: true } }),
    prisma.organization.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, take: 500, select: { id: true, name: true, status: true } }),
  ]);
  return { coupons, grants, overrides, plans, features, organizations };
}

export async function createCommercialCoupon(input: {
  code: string;
  name: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  startsAt: Date;
  endsAt: Date;
  maxRedemptions: number | null;
  maxRedemptionsPerOrganization: number;
  planIds: string[];
}) {
  const access = await requirePermission(PLATFORM_PERMISSIONS.CATALOG_MANAGE, "platform.commercial.coupon.create_requested", "COMMERCIAL_COUPON");
  const codeNormalized = normalizeCouponCode(input.code);
  const name = input.name.trim().replace(/\s+/g, " ");
  const planIds = [...new Set(input.planIds)];
  if (name.length < 3 || name.length > 120 || input.endsAt <= input.startsAt || planIds.length < 1 || planIds.length > 50) {
    throw new CommercialManagementError("INVALID_INPUT", "Nome, validade ou planos do cupom são inválidos.");
  }
  if (!Number.isSafeInteger(input.discountValue) || input.discountValue <= 0 || (input.discountType === "PERCENT" && input.discountValue > 9_900)) {
    throw new CommercialManagementError("INVALID_INPUT", "Valor do desconto é inválido.");
  }
  if ((input.maxRedemptions !== null && (!Number.isSafeInteger(input.maxRedemptions) || input.maxRedemptions < 1)) || !Number.isSafeInteger(input.maxRedemptionsPerOrganization) || input.maxRedemptionsPerOrganization < 1) {
    throw new CommercialManagementError("INVALID_INPUT", "Limites de uso são inválidos.");
  }
  try {
    return await prisma.$transaction(async (tx) => {
      const validPlans = await tx.plan.count({ where: { id: { in: planIds }, active: true, status: "ACTIVE", versions: { some: { status: "PUBLISHED" } } } });
      if (validPlans !== planIds.length) throw new CommercialManagementError("INVALID_INPUT", "Um plano não está publicado ou ativo.");
      const coupon = await tx.commercialCoupon.create({ data: {
        codeNormalized, name, discountType: input.discountType, discountValue: input.discountValue,
        currency: input.discountType === "FIXED" ? "BRL" : null, startsAt: input.startsAt, endsAt: input.endsAt,
        maxRedemptions: input.maxRedemptions, maxRedemptionsPerOrganization: input.maxRedemptionsPerOrganization,
        createdByUserId: access.user!.id, plans: { create: planIds.map((planId) => ({ planId })) },
      } });
      await tx.securityAuditLog.create({ data: {
        userId: access.user!.id, action: "platform.commercial.coupon.created", riskLevel: "HIGH",
        actorRole: access.roleKeys.join(","), permission: PLATFORM_PERMISSIONS.CATALOG_MANAGE,
        targetType: "COMMERCIAL_COUPON", targetId: coupon.id, result: "SUCCESS",
        afterJsonSafe: { codeNormalized, status: "DRAFT", planCount: planIds.length, discountType: input.discountType },
      } });
      return coupon;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof CommercialManagementError || error instanceof CommercialBenefitError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new CommercialManagementError("CONFLICT", "Já existe cupom com esse código.");
    throw error;
  }
}

export async function activateCommercialCoupon(couponId: string) {
  const access = await requirePermission(PLATFORM_PERMISSIONS.CATALOG_PUBLISH, "platform.commercial.coupon.activate_requested", "COMMERCIAL_COUPON", couponId);
  return prisma.$transaction(async (tx) => {
    const coupon = await tx.commercialCoupon.findUnique({ where: { id: couponId }, select: { status: true, startsAt: true, endsAt: true, _count: { select: { plans: true } } } });
    if (!coupon) throw new CommercialManagementError("NOT_FOUND", "Cupom não encontrado.");
    if (coupon.status !== "DRAFT" || coupon.endsAt <= new Date() || coupon._count.plans < 1) throw new CommercialManagementError("CONFLICT", "O draft não pode ser ativado nesse estado.");
    await tx.commercialCoupon.update({ where: { id: couponId }, data: { status: "ACTIVE" } });
    await tx.securityAuditLog.create({ data: {
      userId: access.user!.id, privilegedSessionId: access.privilegedSessionId, action: "platform.commercial.coupon.activated", riskLevel: "HIGH",
      actorRole: access.roleKeys.join(","), permission: PLATFORM_PERMISSIONS.CATALOG_PUBLISH,
      targetType: "COMMERCIAL_COUPON", targetId: couponId, result: "SUCCESS",
      beforeJsonSafe: { status: "DRAFT" }, afterJsonSafe: { status: "ACTIVE" },
    } });
  });
}

export async function createCommercialGrant(input: {
  organizationId: string;
  sourceType: "COURTESY" | "PARTNER" | "SUPPORT" | "MIGRATION" | "OTHER";
  reason: string;
  startsAt: Date;
  expiresAt: Date | null;
  features: Array<{ featureDefinitionId: string; limitValue: number | null }>;
}) {
  const access = await requirePermission(PLATFORM_PERMISSIONS.ENTITLEMENTS_OVERRIDE, "platform.commercial.grant.create_requested", "ORGANIZATION", input.organizationId);
  const features = [...new Map(input.features.map((feature) => [feature.featureDefinitionId, feature])).values()];
  const validation = validateCommercialGrant({ reason: input.reason, startsAt: input.startsAt, expiresAt: input.expiresAt, featureCount: features.length });
  return prisma.$transaction(async (tx) => {
    const [organization, definitions] = await Promise.all([
      tx.organization.findFirst({ where: { id: input.organizationId, status: { not: "ARCHIVED" } }, select: { id: true } }),
      tx.featureDefinition.findMany({ where: { id: { in: features.map((item) => item.featureDefinitionId) }, isActive: true }, select: { id: true, type: true } }),
    ]);
    if (!organization || definitions.length !== features.length) throw new CommercialManagementError("NOT_FOUND", "Organização ou feature não encontrada.");
    for (const feature of features) {
      const definition = definitions.find((item) => item.id === feature.featureDefinitionId)!;
      if (feature.limitValue !== null && (!Number.isSafeInteger(feature.limitValue) || feature.limitValue < 0 || definition.type === "BOOLEAN")) {
        throw new CommercialManagementError("INVALID_INPUT", "Limite incompatível com a feature.");
      }
    }
    const grant = await tx.commercialGrant.create({ data: {
      organizationId: input.organizationId, sourceType: input.sourceType, reason: validation.reason,
      startsAt: input.startsAt, expiresAt: input.expiresAt, createdByUserId: access.user!.id,
      features: { create: features.map((feature) => ({ ...feature, enabled: true })) },
    } });
    await tx.securityAuditLog.create({ data: {
      organizationId: input.organizationId, userId: access.user!.id, privilegedSessionId: access.privilegedSessionId, action: "platform.commercial.grant.created",
      riskLevel: "HIGH", actorRole: access.roleKeys.join(","), permission: PLATFORM_PERMISSIONS.ENTITLEMENTS_OVERRIDE,
      targetType: "COMMERCIAL_GRANT", targetId: grant.id, result: "SUCCESS", reason: validation.reason,
      afterJsonSafe: { sourceType: input.sourceType, featureCount: features.length, expiresAt: input.expiresAt?.toISOString() ?? null, permanent: validation.permanent },
    } });
    return grant;
  });
}

export async function revokeCommercialGrant(grantId: string, reason: string) {
  const access = await requirePermission(PLATFORM_PERMISSIONS.ENTITLEMENTS_OVERRIDE, "platform.commercial.grant.revoke_requested", "COMMERCIAL_GRANT", grantId);
  const validation = validateCommercialGrant({ reason, startsAt: new Date(0), expiresAt: null, featureCount: 1 });
  const result = await prisma.commercialGrant.updateMany({ where: { id: grantId, revokedAt: null }, data: { revokedAt: new Date(), revokedByUserId: access.user!.id } });
  if (result.count !== 1) throw new CommercialManagementError("NOT_FOUND", "Grant não encontrado ou já revogado.");
  await prisma.securityAuditLog.create({ data: {
    userId: access.user!.id, privilegedSessionId: access.privilegedSessionId, action: "platform.commercial.grant.revoked", riskLevel: "HIGH",
    actorRole: access.roleKeys.join(","), permission: PLATFORM_PERMISSIONS.ENTITLEMENTS_OVERRIDE,
    targetType: "COMMERCIAL_GRANT", targetId: grantId, result: "SUCCESS", reason: validation.reason,
  } });
}

export async function createEntitlementOverride(input: {
  organizationId: string;
  featureDefinitionId: string;
  mode: "ENABLE" | "DISABLE" | "SET_LIMIT";
  limitValue: number | null;
  reason: string;
  startsAt: Date;
  expiresAt: Date | null;
}) {
  const access = await requirePermission(PLATFORM_PERMISSIONS.ENTITLEMENTS_OVERRIDE, "platform.entitlement.override.create_requested", "ORGANIZATION", input.organizationId);
  const validation = validateCommercialGrant({ reason: input.reason, startsAt: input.startsAt, expiresAt: input.expiresAt, featureCount: 1 });
  if (input.mode === "SET_LIMIT" ? !Number.isSafeInteger(input.limitValue) || input.limitValue! < 0 : input.limitValue !== null) throw new CommercialManagementError("INVALID_INPUT", "Modo e limite do override são incompatíveis.");
  return prisma.$transaction(async (tx) => {
    const [organization, feature] = await Promise.all([
      tx.organization.findUnique({ where: { id: input.organizationId }, select: { id: true, status: true } }),
      tx.featureDefinition.findUnique({ where: { id: input.featureDefinitionId }, select: { id: true, type: true, isActive: true } }),
    ]);
    if (!organization || organization.status === "ARCHIVED" || !feature?.isActive) throw new CommercialManagementError("NOT_FOUND", "Organização ou feature não encontrada.");
    if (input.mode === "SET_LIMIT" && feature.type === "BOOLEAN") throw new CommercialManagementError("INVALID_INPUT", "Feature booleana não aceita limite.");
    const override = await tx.organizationFeatureOverride.create({ data: { ...input, reason: validation.reason, createdByUserId: access.user!.id } });
    await tx.securityAuditLog.create({ data: {
      organizationId: input.organizationId, userId: access.user!.id, privilegedSessionId: access.privilegedSessionId, action: "platform.entitlement.override.created", riskLevel: "HIGH",
      actorRole: access.roleKeys.join(","), permission: PLATFORM_PERMISSIONS.ENTITLEMENTS_OVERRIDE,
      targetType: "ENTITLEMENT_OVERRIDE", targetId: override.id, result: "SUCCESS", reason: validation.reason,
      afterJsonSafe: { featureDefinitionId: input.featureDefinitionId, mode: input.mode, limitValue: input.limitValue, expiresAt: input.expiresAt?.toISOString() ?? null },
    } });
    return override;
  });
}
