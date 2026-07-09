import { getServerSession } from "next-auth";
import { cache } from "react";
import { OrganizationRole, Prisma, SaaSModuleKey } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SaaSModuleKey as AppModuleKey } from "@/features/saas/domain/modules";
import { ensureDefaultWorkspaceForUser } from "@/features/saas/services/workspaces";
import { getCurrentInternalMaster } from "@/features/master/services/master-access";
import { isProfilePermissionModule } from "@/features/settings/domain/profile-permissions";

export class ModuleAccessError extends Error {
  status = 403;

  constructor(public moduleKey: AppModuleKey) {
    super("Módulo não liberado para este participante.");
  }
}

function isActiveWindow(expiresAt?: Date | null) {
  return !expiresAt || expiresAt.getTime() > Date.now();
}

function canRoleUseOrganizationModule(role: OrganizationRole) {
  return role === OrganizationRole.OWNER || role === OrganizationRole.ADMIN;
}

async function loadCurrentSaaSContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const member = await prisma.organizationMember.findFirst({
    where: {
      user: { email: session.user.email },
      active: true,
      organization: { status: "ACTIVE" },
    },
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

  if (!member) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, name: true },
    });

    if (!user) return null;

    await ensureDefaultWorkspaceForUser(user);

    return loadCurrentSaaSContext();
  }

  return {
    user: member.user,
    member,
    organization: member.organization,
  };
}

export const getCurrentSaaSContext = cache(loadCurrentSaaSContext);

export type SaaSContext = Awaited<ReturnType<typeof loadCurrentSaaSContext>>;

export function contextHasModuleAccess(context: NonNullable<SaaSContext>, moduleKey: AppModuleKey) {
  const entitlement = context.organization.entitlements.find(
    (item) => item.moduleKey === moduleKey && item.enabled && isActiveWindow(item.expiresAt),
  );

  if (!entitlement) return false;

  const profilePermission = context.member.profile?.permissions.find(
    (permission) => permission.moduleKey === moduleKey,
  );

  if (profilePermission) return profilePermission.enabled;
  if (context.member.profileId && isProfilePermissionModule(moduleKey)) return false;
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
