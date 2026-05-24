import { getServerSession } from "next-auth";
import { MarketingEventType, OrganizationRole, Prisma, SaaSModuleKey } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SaaSModuleKey as AppModuleKey } from "@/features/saas/domain/modules";
import { ensureDefaultWorkspaceForUser } from "@/features/saas/services/workspaces";
import { getCurrentInternalMaster } from "@/features/master/services/master-access";

export class ModuleAccessError extends Error {
  status = 403;

  constructor(public moduleKey: AppModuleKey) {
    super("Módulo não liberado para este participante.");
  }
}

export type SaaSContext = Awaited<ReturnType<typeof getCurrentSaaSContext>>;

function isActiveWindow(expiresAt?: Date | null) {
  return !expiresAt || expiresAt.getTime() > Date.now();
}

function canRoleUseOrganizationModule(role: OrganizationRole) {
  return role === OrganizationRole.OWNER || role === OrganizationRole.ADMIN || role === OrganizationRole.BILLING;
}

export async function getCurrentSaaSContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, name: true },
  });

  if (!user) return null;

  await ensureDefaultWorkspaceForUser(user);

  const member = await prisma.organizationMember.findFirst({
    where: {
      userId: user.id,
      active: true,
      organization: { status: "ACTIVE" },
    },
    include: {
      moduleGrants: true,
      organization: {
        include: {
          entitlements: true,
          subscriptions: {
            include: { plan: true },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!member) return null;

  return {
    user,
    member,
    organization: member.organization,
  };
}

export function contextHasModuleAccess(context: NonNullable<SaaSContext>, moduleKey: AppModuleKey) {
  const entitlement = context.organization.entitlements.find(
    (item) => item.moduleKey === moduleKey && item.enabled && isActiveWindow(item.expiresAt),
  );

  if (!entitlement) return false;
  if (canRoleUseOrganizationModule(context.member.role)) return true;

  const memberGrant = context.member.moduleGrants.find(
    (grant) => grant.moduleKey === moduleKey && isActiveWindow(grant.expiresAt),
  );

  return Boolean(memberGrant?.enabled);
}

export async function requireModuleAccess(moduleKey: AppModuleKey) {
  const context = await getCurrentSaaSContext();
  if (!context || !contextHasModuleAccess(context, moduleKey)) {
    throw new ModuleAccessError(moduleKey);
  }

  await prisma.marketingEvent.create({
    data: {
      organizationId: context.organization.id,
      organizationMemberId: context.member.id,
      userId: context.user.id,
      eventType: MarketingEventType.MODULE_USED,
      moduleKey: moduleKey as SaaSModuleKey,
    },
  });

  return context;
}

export function moduleAccessResponse(error: unknown) {
  if (error instanceof ModuleAccessError) {
    return { error: error.message, status: error.status };
  }

  return null;
}

export async function grantParticipantModule(input: {
  organizationMemberId: string;
  moduleKey: AppModuleKey;
  enabled: boolean;
  usageLimit?: number | null;
  expiresAt?: Date | null;
}) {
  const context = await getCurrentSaaSContext();
  const master = await getCurrentInternalMaster();
  if (!context || (!master && !canRoleUseOrganizationModule(context.member.role))) {
    return { error: "Sem permissão para liberar módulos." };
  }

  const target = await prisma.organizationMember.findFirst({
    where: {
      id: input.organizationMemberId,
      organizationId: context.organization.id,
    },
    select: { id: true },
  });

  if (!target) return { error: "Participante não encontrado." };

  await prisma.participantModuleGrant.upsert({
    where: {
      organizationMemberId_moduleKey: {
        organizationMemberId: input.organizationMemberId,
        moduleKey: input.moduleKey as SaaSModuleKey,
      },
    },
    create: {
      organizationMemberId: input.organizationMemberId,
      moduleKey: input.moduleKey as SaaSModuleKey,
      enabled: input.enabled,
      usageLimit: input.usageLimit ?? null,
      expiresAt: input.expiresAt ?? null,
    },
    update: {
      enabled: input.enabled,
      usageLimit: input.usageLimit ?? null,
      expiresAt: input.expiresAt ?? null,
    },
  });

  await prisma.securityAuditLog.create({
    data: {
      organizationId: context.organization.id,
      userId: context.user.id,
      action: "participant.module_grant.updated",
      riskLevel: "INFO",
      metadata: {
        organizationMemberId: input.organizationMemberId,
        moduleKey: input.moduleKey,
        enabled: input.enabled,
      } as Prisma.InputJsonValue,
    },
  });

  return { success: true };
}
