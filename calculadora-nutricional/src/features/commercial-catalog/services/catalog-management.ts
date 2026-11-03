import "server-only";

import { Prisma } from "@prisma/client";

import {
  assertPlanVersionPublishable,
  requireStableCatalogKey,
  type BillingInterval,
} from "@/features/commercial-catalog/domain/catalog";
import { PLATFORM_PERMISSIONS } from "@/features/platform-iam/domain/platform-authorization";
import { authorizePlatformRequest } from "@/features/platform-iam/services/platform-access";
import { authorizePrivilegedPlatformRequest } from "@/features/platform-iam/services/privileged-sessions";
import { prisma } from "@/lib/prisma";

export class CatalogManagementError extends Error {
  constructor(
    public code: "FORBIDDEN" | "INVALID_INPUT" | "CONFLICT" | "NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "CatalogManagementError";
  }
}

function requireName(value: string) {
  const name = value.trim();
  if (name.length < 2 || name.length > 120) {
    throw new CatalogManagementError("INVALID_INPUT", "O nome deve ter entre 2 e 120 caracteres.");
  }
  return name;
}

async function requireCatalogPermission(input: {
  permission: typeof PLATFORM_PERMISSIONS.CATALOG_MANAGE | typeof PLATFORM_PERMISSIONS.CATALOG_PUBLISH;
  action: string;
  targetId?: string;
}) {
  const authorize = input.permission === PLATFORM_PERMISSIONS.CATALOG_PUBLISH
    ? authorizePrivilegedPlatformRequest
    : authorizePlatformRequest;
  const access = await authorize({
    permission: input.permission,
    action: input.action,
    targetType: input.permission === PLATFORM_PERMISSIONS.CATALOG_PUBLISH
      ? "PLAN_VERSION"
      : "COMMERCIAL_CATALOG",
    targetId: input.targetId,
  });
  if (!access.allowed || !access.user) {
    throw new CatalogManagementError("FORBIDDEN", "Sem permissão para alterar o catálogo comercial.");
  }
  return {
    ...access,
    privilegedSessionId: "privilegedSessionId" in access && typeof access.privilegedSessionId === "string"
      ? access.privilegedSessionId
      : null,
  };
}

export async function listCommercialCatalog() {
  const [plans, features] = await Promise.all([
    prisma.plan.findMany({
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          include: {
            _count: { select: { features: true, prices: true, subscriptions: true } },
            prices: { where: { status: "ACTIVE" }, orderBy: [{ currency: "asc" }, { billingInterval: "asc" }] },
          },
        },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    prisma.featureDefinition.findMany({
      orderBy: [{ moduleKey: "asc" }, { key: "asc" }],
    }),
  ]);
  return { plans, features };
}

export async function createPlanDraft(input: {
  code: string;
  name: string;
  description?: string | null;
  isPaid: boolean;
  features: Array<{ featureDefinitionId: string; limitValue: number | null }>;
  prices: Array<{ amountMinor: number; billingInterval: BillingInterval }>;
}) {
  const access = await requireCatalogPermission({
    permission: PLATFORM_PERMISSIONS.CATALOG_MANAGE,
    action: "platform.catalog.plan.create_requested",
  });
  const code = requireStableCatalogKey(input.code);
  const name = requireName(input.name);
  const description = input.description?.trim().slice(0, 2000) || null;

  try {
    return await prisma.$transaction(async (tx) => {
      const definitions = await tx.featureDefinition.findMany({
        where: { id: { in: input.features.map((feature) => feature.featureDefinitionId) }, isActive: true },
        select: { id: true, key: true, type: true, isActive: true },
      });
      if (definitions.length !== input.features.length) {
        throw new CatalogManagementError("INVALID_INPUT", "Uma ou mais features são inválidas ou estão inativas.");
      }

      const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
      assertPlanVersionPublishable({
        status: "DRAFT",
        versionNumber: 1,
        isPaid: input.isPaid,
        features: input.features.map((feature) => {
          const definition = definitionById.get(feature.featureDefinitionId)!;
          return {
            key: definition.key,
            type: definition.type,
            definitionActive: definition.isActive,
            enabled: true,
            limitValue: feature.limitValue,
          };
        }),
        prices: input.prices.map((price) => ({
          status: "ACTIVE",
          currency: "BRL",
          amountMinor: price.amountMinor,
          billingInterval: price.billingInterval,
        })),
      });

      const plan = await tx.plan.create({
        data: {
          code,
          name,
          description,
          active: false,
          status: "DRAFT",
          isPaid: input.isPaid,
          versions: {
            create: {
              versionNumber: 1,
              status: "DRAFT",
              createdByUserId: access.user!.id,
              features: {
                create: input.features.map((feature) => ({
                  featureDefinitionId: feature.featureDefinitionId,
                  enabled: true,
                  limitValue: feature.limitValue,
                })),
              },
              prices: {
                create: input.prices.map((price) => ({
                  amountMinor: price.amountMinor,
                  billingInterval: price.billingInterval,
                  currency: "BRL",
                  status: "ACTIVE",
                })),
              },
            },
          },
        },
        include: { versions: { select: { id: true } } },
      });

      await tx.securityAuditLog.create({
        data: {
          userId: access.user!.id,
          action: "platform.catalog.plan.created",
          riskLevel: "MEDIUM",
          actorType: access.source === "BREAK_GLASS" ? "BREAK_GLASS" : "USER",
          actorRole: access.roleKeys.join(",") || null,
          permission: PLATFORM_PERMISSIONS.CATALOG_MANAGE,
          targetType: "PLAN",
          targetId: plan.id,
          result: "SUCCESS",
          reason: "draft_created",
          afterJsonSafe: {
            code,
            versionNumber: 1,
            featureCount: input.features.length,
            priceCount: input.prices.length,
          } satisfies Prisma.InputJsonValue,
        },
      });
      return { planId: plan.id, planVersionId: plan.versions[0]!.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof CatalogManagementError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new CatalogManagementError("CONFLICT", "A chave do plano já existe.");
    }
    throw error;
  }
}

export async function publishPlanVersion(planVersionId: string) {
  const access = await requireCatalogPermission({
    permission: PLATFORM_PERMISSIONS.CATALOG_PUBLISH,
    action: "platform.catalog.version.publish_requested",
    targetId: planVersionId,
  });

  return prisma.$transaction(async (tx) => {
    const version = await tx.planVersion.findUnique({
      where: { id: planVersionId },
      include: {
        plan: { select: { id: true, isPaid: true } },
        features: { include: { featureDefinition: true } },
        prices: true,
      },
    });
    if (!version) throw new CatalogManagementError("NOT_FOUND", "Versão de plano não encontrada.");

    assertPlanVersionPublishable({
      status: version.status,
      versionNumber: version.versionNumber,
      isPaid: version.plan.isPaid,
      features: version.features.map((feature) => ({
        key: feature.featureDefinition.key,
        type: feature.featureDefinition.type,
        definitionActive: feature.featureDefinition.isActive,
        enabled: feature.enabled,
        limitValue: feature.limitValue,
      })),
      prices: version.prices.map((price) => ({
        status: price.status,
        currency: price.currency,
        amountMinor: price.amountMinor,
        billingInterval: price.billingInterval,
      })),
    });

    const publishedAt = new Date();
    const result = await tx.planVersion.updateMany({
      where: { id: version.id, status: "DRAFT" },
      data: { status: "PUBLISHED", publishedAt, validFrom: publishedAt },
    });
    if (result.count !== 1) {
      throw new CatalogManagementError("CONFLICT", "A versão mudou durante a publicação. Recarregue e revise.");
    }

    await tx.plan.update({
      where: { id: version.plan.id },
      data: { status: "ACTIVE", active: true, archivedAt: null },
    });
    await tx.securityAuditLog.create({
      data: {
        userId: access.user!.id,
        privilegedSessionId: access.privilegedSessionId,
        action: "platform.catalog.version.published",
        riskLevel: "HIGH",
        actorType: access.source === "BREAK_GLASS" ? "BREAK_GLASS" : "USER",
        actorRole: access.roleKeys.join(",") || null,
        permission: PLATFORM_PERMISSIONS.CATALOG_PUBLISH,
        targetType: "PLAN_VERSION",
        targetId: version.id,
        result: "SUCCESS",
        reason: "version_published_immutable",
        beforeJsonSafe: { status: version.status } satisfies Prisma.InputJsonValue,
        afterJsonSafe: {
          status: "PUBLISHED",
          versionNumber: version.versionNumber,
          publishedAt: publishedAt.toISOString(),
        } satisfies Prisma.InputJsonValue,
      },
    });

    return { planId: version.plan.id, planVersionId: version.id };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
