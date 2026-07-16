import { OrganizationRole, Prisma, SaaSModuleKey as PrismaSaaSModuleKey } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { ALL_SAAS_MODULES, SAAS_MODULES, type SaaSModuleKey } from "@/features/saas/domain/modules";
import { contextHasModuleAccess, type SaaSContext } from "@/features/saas/services/entitlements";
import { PROFILE_PERMISSION_MODULES } from "@/features/settings/domain/profile-permissions";

const DEFAULT_PROFILES = [
    {
        systemKey: "OWNER",
        role: OrganizationRole.OWNER,
        name: "Proprietário",
        description: "Acesso completo ao workspace.",
        modules: PROFILE_PERMISSION_MODULES,
    },
    {
        systemKey: "ADMIN",
        role: OrganizationRole.ADMIN,
        name: "Administrador",
        description: "Gerencia usuários, perfis e funcionalidades.",
        modules: PROFILE_PERMISSION_MODULES,
    },
    {
        systemKey: "MEMBER",
        role: OrganizationRole.MEMBER,
        name: "Colaborador",
        description: "Acesso operacional padrão.",
        modules: [
            SAAS_MODULES.TABLES,
            SAAS_MODULES.CUSTOM_INGREDIENTS,
            SAAS_MODULES.TECHNICAL_SHEETS,
            SAAS_MODULES.OPEN_FOOD_FACTS,
            SAAS_MODULES.EXPORTS,
            SAAS_MODULES.AI_IMPORT,
        ] as const satisfies readonly SaaSModuleKey[],
    },
] as const;

const DEFAULT_PROFILE_KEYS = DEFAULT_PROFILES.map((profile) => profile.systemKey);

export function canManageOrganizationSettings(context: NonNullable<SaaSContext>) {
    return contextHasModuleAccess(context, SAAS_MODULES.SETTINGS);
}

export async function ensureOrganizationProfiles(organizationId: string) {
    await prisma.organizationEntitlement.createMany({
        data: ALL_SAAS_MODULES.map((moduleKey) => ({
            organizationId,
            moduleKey: moduleKey as PrismaSaaSModuleKey,
            enabled: true,
            source: "SYSTEM_DEFAULT",
        })),
        skipDuplicates: true,
    });

    const [profiles, memberWithoutProfile] = await Promise.all([
        prisma.organizationProfile.findMany({
            where: {
                organizationId,
                systemKey: { in: DEFAULT_PROFILE_KEYS },
            },
            select: {
                systemKey: true,
                description: true,
                permissions: {
                    select: { moduleKey: true, enabled: true },
                },
            },
        }),
        prisma.organizationMember.findFirst({
            where: {
                organizationId,
                profileId: null,
            },
            select: { id: true },
        }),
    ]);
    const profilesByKey = new Map(profiles.map((profile) => [profile.systemKey, profile]));
    const defaultsReady =
        !memberWithoutProfile &&
        DEFAULT_PROFILES.every((profileDefinition) => {
            const profile = profilesByKey.get(profileDefinition.systemKey);
            if (!profile || profile.description !== profileDefinition.description) return false;
            const permissions = new Map(
                profile.permissions.map((permission) => [permission.moduleKey, permission.enabled]),
            );
            return PROFILE_PERMISSION_MODULES.every((moduleKey) => {
                const enabled = permissions.get(moduleKey as PrismaSaaSModuleKey);
                return enabled !== undefined && (profile.systemKey !== "ADMIN" || enabled);
            });
        });

    if (defaultsReady) return;

    await prisma.$transaction(async (tx) => {
        let adminProfileId: string | null = null;

        for (const profileDefinition of DEFAULT_PROFILES) {
            const profile = await tx.organizationProfile.upsert({
                where: {
                    organizationId_systemKey: {
                        organizationId,
                        systemKey: profileDefinition.systemKey,
                    },
                },
                create: {
                    organizationId,
                    name: profileDefinition.name,
                    description: profileDefinition.description,
                    systemKey: profileDefinition.systemKey,
                },
                update: {
                    description: profileDefinition.description,
                },
                select: { id: true },
            });

            if (profileDefinition.role === OrganizationRole.ADMIN) {
                adminProfileId = profile.id;
            }

            await tx.organizationProfilePermission.createMany({
                data: PROFILE_PERMISSION_MODULES.map((moduleKey) => ({
                    organizationProfileId: profile.id,
                    moduleKey: moduleKey as PrismaSaaSModuleKey,
                    enabled: (profileDefinition.modules as readonly SaaSModuleKey[]).includes(moduleKey),
                })),
                skipDuplicates: true,
            });

            if (profileDefinition.systemKey === "ADMIN") {
                await tx.organizationProfilePermission.updateMany({
                    where: {
                        organizationProfileId: profile.id,
                        moduleKey: {
                            in: PROFILE_PERMISSION_MODULES.map((moduleKey) => moduleKey as PrismaSaaSModuleKey),
                        },
                    },
                    data: { enabled: true },
                });
            }
        }

        if (adminProfileId) {
            await tx.organizationMember.updateMany({
                where: {
                    organizationId,
                    profileId: null,
                },
                data: { profileId: adminProfileId },
            });
        }
    }, { timeout: 20_000 });
}

export async function getOrganizationSettingsData(organizationId: string) {
    await ensureOrganizationProfiles(organizationId);

    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
            id: true,
            entitlements: {
                select: {
                    moduleKey: true,
                    enabled: true,
                },
            },
            members: {
                select: {
                    id: true,
                    role: true,
                    active: true,
                    profileId: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    profile: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: [
                    { role: "asc" },
                    { createdAt: "asc" },
                ],
            },
            profiles: {
                select: {
                    id: true,
                    name: true,
                    description: true,
                    systemKey: true,
                    permissions: {
                        select: {
                            moduleKey: true,
                            enabled: true,
                        },
                    },
                    _count: {
                        select: { members: true },
                    },
                },
                orderBy: { createdAt: "asc" },
            },
        },
    });

    if (!organization) return null;

    return organization;
}

export function profilePermissionEnabled(
    permissions: Array<{ moduleKey: PrismaSaaSModuleKey; enabled: boolean }>,
    moduleKey: SaaSModuleKey,
) {
    const permission = permissions.find((item) => item.moduleKey === moduleKey);
    return Boolean(permission?.enabled);
}

export function settingsAuditMetadata(value: Record<string, unknown>) {
    return value as Prisma.InputJsonValue;
}
