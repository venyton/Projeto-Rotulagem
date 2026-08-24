import "server-only";

import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { cache } from "react";
import { OrganizationRole, Prisma, SaaSModuleKey } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ALL_SAAS_MODULES, type SaaSModuleKey as AppModuleKey } from "@/features/saas/domain/modules";
import { getCurrentInternalMaster } from "@/features/master/services/master-access";
import { isProfilePermissionModule } from "@/features/settings/domain/profile-permissions";
import { hasEffectiveModuleAccess } from "@/features/saas/domain/module-access";

export const ACTIVE_ORGANIZATION_COOKIE = "soizi-active-organization";

export class ModuleAccessError extends Error {
  status = 403;

  constructor(public moduleKey: AppModuleKey) {
    super("Módulo não liberado para este participante.");
  }
}

function canRoleUseOrganizationModule(role: OrganizationRole) {
  return role === OrganizationRole.OWNER || role === OrganizationRole.ADMIN;
}

async function loadCurrentSaaSContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const cookieStore = await cookies();
  const selectedOrganizationId = cookieStore.get(ACTIVE_ORGANIZATION_COOKIE)?.value;
  const memberWhere = {
    user: { email: session.user.email },
    active: true,
    organization: { status: "ACTIVE" as const },
  };

  let member = await prisma.organizationMember.findFirst({
    where: selectedOrganizationId
      ? { ...memberWhere, organizationId: selectedOrganizationId }
      : memberWhere,
    select: {
      id: true,
      organizationId: true,
      userId: true,
      profileId: true,
      role: true,
      active: true,
      user: {
        select: { id: true, email: true, name: true },
      },
      moduleGrants: {
        select: {
          moduleKey: true,
          enabled: true,
          expiresAt: true,
        },
      },
      profile: {
        select: {
          id: true,
          systemKey: true,
          permissions: {
            select: {
              moduleKey: true,
              enabled: true,
            },
          },
        },
      },
      organization: {
        select: {
          id: true,
          lupaStyleConfig: true,
          entitlements: {
            select: {
              moduleKey: true,
              enabled: true,
              expiresAt: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Cookie inválido ou organização removida: recua para uma associação válida
  // em vez de provisionar ou consultar dados fora do workspace escolhido.
  if (!member && selectedOrganizationId) {
    member = await prisma.organizationMember.findFirst({
      where: memberWhere,
      select: {
        id: true,
        organizationId: true,
        userId: true,
        profileId: true,
        role: true,
        active: true,
        user: { select: { id: true, email: true, name: true } },
        moduleGrants: { select: { moduleKey: true, enabled: true, expiresAt: true } },
        profile: {
          select: {
            id: true,
            systemKey: true,
            permissions: { select: { moduleKey: true, enabled: true } },
          },
        },
        organization: {
          select: {
            id: true,
            lupaStyleConfig: true,
            entitlements: { select: { moduleKey: true, enabled: true, expiresAt: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  if (!member) {
    // Context reads must remain side-effect free. Workspace provisioning is
    // handled at registration/OAuth login, not while rendering a page.
    return null;
  }

  const entitlementKeys = new Set(member.organization.entitlements.map((item) => item.moduleKey));
  const missingEntitlements = ALL_SAAS_MODULES
    .filter((moduleKey) => !entitlementKeys.has(moduleKey))
    .map((moduleKey) => ({ moduleKey: moduleKey as SaaSModuleKey, enabled: true, expiresAt: null }));

  return {
    user: member.user,
    member,
    organization: {
      ...member.organization,
      entitlements: [...member.organization.entitlements, ...missingEntitlements],
    },
  };
}

export const getCurrentSaaSContext = cache(loadCurrentSaaSContext);

export async function listAvailableSaaSOrganizations() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return [];

  const memberships = await prisma.organizationMember.findMany({
    where: {
      user: { email: session.user.email },
      active: true,
      organization: { status: "ACTIVE" },
    },
    select: {
      organizationId: true,
      role: true,
      organization: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return memberships.map((membership) => ({
    id: membership.organizationId,
    name: membership.organization.name,
    slug: membership.organization.slug,
    role: membership.role,
  }));
}

export type SaaSContext = Awaited<ReturnType<typeof loadCurrentSaaSContext>>;

export function contextHasModuleAccess(context: NonNullable<SaaSContext>, moduleKey: AppModuleKey) {
  return hasEffectiveModuleAccess({
    moduleKey,
    organizationEntitlements: context.organization.entitlements,
    profilePermissions: context.member.profile?.permissions,
    hasProfile: Boolean(context.member.profileId),
    role: context.member.role,
    memberGrants: context.member.moduleGrants,
    profileControlledModules: isProfilePermissionModule(moduleKey) ? [moduleKey] : [],
  });
}

export async function requireModuleAccess(moduleKey: AppModuleKey) {
  const context = await getCurrentSaaSContext();
  if (!context || !contextHasModuleAccess(context, moduleKey)) {
    throw new ModuleAccessError(moduleKey);
  }

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
