import "server-only";

import { Prisma, type OrganizationStatus, type SubscriptionStatus } from "@prisma/client";

import {
  assertOrganizationStatusTransition,
  maskedDocumentLabel,
  type OrganizationAdminFilters,
} from "@/features/platform-iam/domain/customer-administration";
import type { PlatformPermissionKey } from "@/features/platform-iam/domain/platform-authorization";
import { resolveOrganizationFeatureEntitlements } from "@/features/saas/services/feature-entitlements";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 25;

function hasPermission(permissions: readonly PlatformPermissionKey[], permission: string) {
  return permissions.includes(permission as PlatformPermissionKey);
}

export async function listOrganizationsForAdministration(filters: OrganizationAdminFilters) {
  const digits = filters.query.replace(/\D/g, "");
  const where: Prisma.OrganizationWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...((filters.plan || filters.billing) ? {
      AND: [
        ...(filters.plan ? [{ subscriptions: { some: { planVersion: { plan: { code: { equals: filters.plan, mode: "insensitive" as const } } } } } }] : []),
        ...(filters.billing ? [{ subscriptions: { some: { status: filters.billing as SubscriptionStatus } } }] : []),
      ],
    } : {}),
    ...(filters.query ? {
      OR: [
        { name: { contains: filters.query, mode: "insensitive" } },
        { legalName: { contains: filters.query, mode: "insensitive" } },
        { tradeName: { contains: filters.query, mode: "insensitive" } },
        { owner: { email: { contains: filters.query, mode: "insensitive" } } },
        ...(digits.length > 0 && digits.length <= 4
          ? [{ cpfLastFour: { endsWith: digits } }, { cnpjLastFour: { endsWith: digits } }]
          : []),
      ],
    } : {}),
  };

  const [total, organizations] = await prisma.$transaction([
    prisma.organization.count({ where }),
    prisma.organization.findMany({
      where,
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        status: true,
        kind: true,
        cpfLastFour: true,
        cnpjLastFour: true,
        updatedAt: true,
        owner: { select: { email: true } },
        members: { where: { active: true }, select: { id: true } },
        invitations: { where: { status: "PENDING" }, select: { id: true } },
        subscriptions: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: {
            status: true,
            planVersion: { select: { versionNumber: true, plan: { select: { name: true, code: true } } } },
          },
        },
        billingCustomers: {
          where: { provider: "ASAAS" },
          take: 1,
          select: { status: true, lastErrorCode: true },
        },
        securityAuditLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true, riskLevel: true, result: true },
        },
      },
    }),
  ]);

  const rows = await Promise.all(organizations.map(async (organization) => {
    const entitlements = await resolveOrganizationFeatureEntitlements(organization.id);
    const seatLimit = entitlements?.find((item) => item.featureKey === "seats_max")?.limit ?? null;
    const subscription = organization.subscriptions[0] ?? null;
    const billingCustomer = organization.billingCustomers[0] ?? null;
    const riskFlags = [
      organization.status === "SUSPENDED" ? "Organização suspensa" : null,
      subscription?.status === "PAST_DUE" || subscription?.status === "UNPAID" ? "Cobrança pendente" : null,
      billingCustomer?.status === "SYNC_ERROR" ? "Falha de sincronização" : null,
      organization.securityAuditLogs[0]?.result === "DENIED" ? "Acesso negado recente" : null,
    ].filter((value): value is string => Boolean(value));

    return {
      id: organization.id,
      name: organization.name,
      ownerEmail: organization.owner.email,
      status: organization.status,
      document: maskedDocumentLabel(organization),
      plan: subscription?.planVersion
        ? `${subscription.planVersion.plan.name} v${subscription.planVersion.versionNumber}`
        : "Sem plano publicado",
      planCode: subscription?.planVersion?.plan.code ?? null,
      billingStatus: subscription?.status ?? billingCustomer?.status ?? "SEM_ASSINATURA",
      seatsUsed: organization.members.length + organization.invitations.length,
      seatLimit,
      lastActivityAt: organization.securityAuditLogs[0]?.createdAt ?? organization.updatedAt,
      riskFlags,
    };
  }));

  return { rows, total, page: filters.page, pageSize: PAGE_SIZE, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function listBillingOperationsForAdministration() {
  const [subscriptions, checkouts, charges, webhooks] = await Promise.all([
    prisma.subscription.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true, status: true, provider: true, currentPeriodEnd: true, updatedAt: true,
        organization: { select: { id: true, name: true, status: true } },
        planVersion: { select: { versionNumber: true, plan: { select: { name: true } } } },
      },
    }),
    prisma.billingCheckoutAttempt.findMany({
      where: { status: { in: ["ACTIVE", "FAILED", "OUTCOME_UNKNOWN"] } },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, status: true, lastErrorCode: true, updatedAt: true, organization: { select: { id: true, name: true } } },
    }),
    prisma.billingCharge.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, status: true, amountMinor: true, currency: true, paidAt: true, updatedAt: true, organization: { select: { id: true, name: true } } },
    }),
    prisma.billingWebhookEvent.findMany({
      where: { status: { in: ["FAILED", "RECEIVED"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, type: true, status: true, processingAttempts: true, lastErrorCode: true, createdAt: true, organization: { select: { id: true, name: true } } },
    }),
  ]);
  return { subscriptions, checkouts, charges, webhooks };
}

export async function getOrganizationForAdministration(
  organizationId: string,
  permissions: readonly PlatformPermissionKey[],
) {
  const canReadUsers = hasPermission(permissions, "platform.users.read");
  const canReadBilling = hasPermission(permissions, "platform.billing.read");
  const canReadEntitlements = hasPermission(permissions, "platform.entitlements.read");
  const canReadAudit = hasPermission(permissions, "platform.audit.read");
  const canReadSupport = hasPermission(permissions, "platform.support.metadata.read");

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      legalName: true,
      tradeName: true,
      kind: true,
      cpfLastFour: true,
      cnpjLastFour: true,
      status: true,
      entitlementPolicyVersion: true,
      createdAt: true,
      updatedAt: true,
      owner: { select: { id: true, name: true, email: true, twoFactorEnabled: true } },
    },
  });
  if (!organization) return null;

  const [members, billing, entitlements, audit, security] = await Promise.all([
    canReadUsers
      ? prisma.organizationMember.findMany({
        where: { organizationId },
        orderBy: [{ active: "desc" }, { createdAt: "asc" }],
        take: 100,
        select: {
          id: true,
          role: true,
          active: true,
          createdAt: true,
          user: { select: { name: true, email: true, twoFactorEnabled: true } },
          profile: { select: { name: true } },
        },
      })
      : null,
    canReadBilling
      ? Promise.all([
        prisma.subscription.findMany({
          where: { organizationId }, orderBy: { updatedAt: "desc" }, take: 10,
          select: {
            id: true, status: true, provider: true, currentPeriodStart: true, currentPeriodEnd: true,
            cancelAtPeriodEnd: true, trialEndsAt: true, updatedAt: true,
            planVersion: { select: { versionNumber: true, plan: { select: { name: true, code: true } } } },
            billingPrice: { select: { amountMinor: true, currency: true, billingInterval: true } },
            couponRedemption: { select: { revokedAt: true, finalAmountMinor: true, appliedDiscountMinor: true, currency: true, coupon: { select: { codeNormalized: true } } } },
          },
        }),
        prisma.billingCharge.findMany({
          where: { organizationId }, orderBy: { createdAt: "desc" }, take: 25,
          select: { id: true, status: true, amountMinor: true, currency: true, dueDate: true, confirmedAt: true, paidAt: true, createdAt: true },
        }),
        prisma.billingCheckoutAttempt.findMany({
          where: { organizationId }, orderBy: { createdAt: "desc" }, take: 20,
          select: { id: true, status: true, providerStatus: true, expiresAt: true, lastErrorCode: true, createdAt: true },
        }),
        prisma.billingWebhookEvent.findMany({
          where: { organizationId, status: { in: ["FAILED", "RECEIVED"] } }, orderBy: { createdAt: "desc" }, take: 20,
          select: { id: true, providerEventId: true, type: true, status: true, processingAttempts: true, lastErrorCode: true, createdAt: true },
        }),
      ])
      : null,
    canReadEntitlements ? resolveOrganizationFeatureEntitlements(organizationId) : null,
    canReadAudit
      ? prisma.securityAuditLog.findMany({
        where: { organizationId }, orderBy: { createdAt: "desc" }, take: 50,
        select: { id: true, action: true, riskLevel: true, result: true, reason: true, createdAt: true, user: { select: { email: true } } },
      })
      : null,
    canReadSupport
      ? Promise.all([
        prisma.apiAccessToken.count({ where: { organizationId, revokedAt: null } }),
        prisma.securityAuditLog.count({ where: { organizationId, riskLevel: { in: ["HIGH", "CRITICAL"] } } }),
        prisma.organizationInvitation.count({ where: { organizationId, status: "PENDING" } }),
      ])
      : null,
  ]);

  return {
    organization: {
      ...organization,
      document: maskedDocumentLabel(organization),
      cpfLastFour: undefined,
      cnpjLastFour: undefined,
    },
    members,
    billing: billing ? { subscriptions: billing[0], charges: billing[1], checkouts: billing[2], pendingWebhooks: billing[3] } : null,
    entitlements,
    audit,
    security: security ? { activeApiTokens: security[0], elevatedSecurityEvents: security[1], pendingInvitations: security[2] } : null,
  };
}

export async function updateOrganizationAdministrativeStatus(input: {
  organizationId: string;
  nextStatus: OrganizationStatus;
  reason: string;
  actorUserId: string;
  actorRole: string;
  privilegedSessionId: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.organization.findUnique({ where: { id: input.organizationId }, select: { status: true } });
    if (!current) throw new Error("Organização não encontrada.");
    assertOrganizationStatusTransition(current.status, input.nextStatus);
    if (current.status === input.nextStatus) return { changed: false, status: current.status };

    await tx.organization.update({ where: { id: input.organizationId }, data: { status: input.nextStatus } });
    await tx.securityAuditLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.actorUserId,
        privilegedSessionId: input.privilegedSessionId,
        action: "platform.organization.status.updated",
        riskLevel: "HIGH",
        actorType: "USER",
        actorRole: input.actorRole,
        permission: "platform.organizations.update",
        targetType: "ORGANIZATION",
        targetId: input.organizationId,
        result: "SUCCESS",
        reason: input.reason,
        beforeJsonSafe: { status: current.status },
        afterJsonSafe: { status: input.nextStatus },
      },
    });
    return { changed: true, status: input.nextStatus };
  });
}
