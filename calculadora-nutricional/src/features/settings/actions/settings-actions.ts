"use server";

import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { OrganizationRole, SaaSModuleKey as PrismaSaaSModuleKey } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { PASSWORD_HASH_ROUNDS, validatePasswordStrength } from "@/lib/security/password";
import { isSaaSModuleKey } from "@/features/saas/domain/modules";
import { getCurrentSaaSContext } from "@/features/saas/services/entitlements";
import { PROFILE_PERMISSION_MODULES } from "@/features/settings/domain/profile-permissions";
import {
    canManageOrganizationSettings,
    ensureOrganizationProfiles,
    settingsAuditMetadata,
} from "@/features/settings/services/organization-settings";

async function requireSettingsContext() {
    const context = await getCurrentSaaSContext();
    if (!context || !canManageOrganizationSettings(context)) {
        throw new Error("Sem permissão para alterar configurações.");
    }

    await ensureOrganizationProfiles(context.organization.id);
    return context;
}

function normalizeEmail(value: string) {
    return value.trim().toLowerCase();
}

function redirectUserError(error: string): never {
    redirect(`/dashboard/settings?tab=users&userError=${error}`);
}

export async function createOrganizationUser(formData: FormData) {
    const context = await requireSettingsContext();
    const name = String(formData.get("name") || "").trim();
    const email = normalizeEmail(String(formData.get("email") || ""));
    const password = String(formData.get("password") || "");
    const profileId = String(formData.get("profileId") || "");

    if (name.length < 2 || name.length > 80) redirectUserError("invalid");
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirectUserError("invalid");

    const passwordError = validatePasswordStrength(password, { email, name });
    if (passwordError) redirectUserError("password");

    const [existingUser, profile] = await Promise.all([
        prisma.user.findUnique({
            where: { email },
            select: { id: true },
        }),
        prisma.organizationProfile.findFirst({
            where: {
                id: profileId,
                organizationId: context.organization.id,
            },
            select: { id: true, name: true },
        }),
    ]);

    if (existingUser) redirectUserError("exists");
    if (!profile) redirectUserError("profile");

    const hashedPassword = await hash(password, PASSWORD_HASH_ROUNDS);

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            organizationMemberships: {
                create: {
                    organizationId: context.organization.id,
                    role: OrganizationRole.MEMBER,
                    profileId: profile.id,
                    active: true,
                },
            },
        },
        select: { id: true },
    });

    await prisma.securityAuditLog.create({
        data: {
            organizationId: context.organization.id,
            userId: context.user.id,
            action: "settings.user.created",
            riskLevel: "INFO",
            metadata: settingsAuditMetadata({
                targetUserId: user.id,
                email,
                profileId: profile.id,
                profileName: profile.name,
            }),
        },
    });

    revalidatePath("/dashboard/settings");
    redirect("/dashboard/settings?tab=users&userCreated=1");
}

export async function updateMemberProfile(formData: FormData) {
    const context = await requireSettingsContext();
    const memberId = String(formData.get("memberId") || "");
    const profileId = String(formData.get("profileId") || "");

    if (!/^[A-Za-z0-9_-]{1,100}$/.test(memberId) || !/^[A-Za-z0-9_-]{1,100}$/.test(profileId)) return;

    const [targetMember, targetProfile] = await Promise.all([
        prisma.organizationMember.findFirst({
            where: {
                id: memberId,
                organizationId: context.organization.id,
            },
            select: {
                id: true,
                role: true,
                userId: true,
            },
        }),
        prisma.organizationProfile.findFirst({
            where: {
                id: profileId,
                organizationId: context.organization.id,
            },
            select: { id: true, name: true },
        }),
    ]);

    if (!targetMember || !targetProfile) return;
    if (targetMember.role === OrganizationRole.OWNER && context.member.id !== targetMember.id) return;

    await prisma.organizationMember.update({
        where: { id: targetMember.id },
        data: { profileId: targetProfile.id },
    });

    await prisma.securityAuditLog.create({
        data: {
            organizationId: context.organization.id,
            userId: context.user.id,
            action: "settings.member_profile.updated",
            riskLevel: "INFO",
            metadata: settingsAuditMetadata({
                organizationMemberId: targetMember.id,
                targetUserId: targetMember.userId,
                profileId: targetProfile.id,
                profileName: targetProfile.name,
            }),
        },
    });

    revalidatePath("/dashboard/settings");
}

export async function createOrganizationProfile(formData: FormData) {
    const context = await requireSettingsContext();
    const name = String(formData.get("name") || "").trim();
    const description = String(formData.get("description") || "").trim();

    if (name.length < 2 || name.length > 60 || description.length > 500) return;

    const existingProfile = await prisma.organizationProfile.findFirst({
        where: {
            organizationId: context.organization.id,
            name,
        },
        select: { id: true },
    });

    if (existingProfile) return;

    const profile = await prisma.organizationProfile.create({
        data: {
            organizationId: context.organization.id,
            name,
            description: description || null,
            systemKey: `CUSTOM_${randomUUID()}`,
            permissions: {
                createMany: {
                    data: PROFILE_PERMISSION_MODULES.map((moduleKey) => ({
                        moduleKey: moduleKey as PrismaSaaSModuleKey,
                        enabled: false,
                    })),
                },
            },
        },
        select: { id: true, name: true },
    });

    await prisma.securityAuditLog.create({
        data: {
            organizationId: context.organization.id,
            userId: context.user.id,
            action: "settings.profile.created",
            riskLevel: "INFO",
            metadata: settingsAuditMetadata({
                profileId: profile.id,
                profileName: profile.name,
            }),
        },
    });

    revalidatePath("/dashboard/settings");
    redirect(`/dashboard/settings?tab=profiles&profile=${profile.id}`);
}

export async function updateOrganizationProfile(formData: FormData) {
    const context = await requireSettingsContext();
    const profileId = String(formData.get("profileId") || "");
    const name = String(formData.get("name") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const selectedModules = new Set(
        formData
            .getAll("moduleKey")
            .map((value) => String(value))
            .filter(isSaaSModuleKey),
    );

    if (!/^[A-Za-z0-9_-]{1,100}$/.test(profileId) || name.length < 2 || name.length > 60 || description.length > 500) return;

    const [profile, duplicateProfile] = await Promise.all([
        prisma.organizationProfile.findFirst({
            where: {
                id: profileId,
                organizationId: context.organization.id,
            },
            select: { id: true, name: true, systemKey: true },
        }),
        prisma.organizationProfile.findFirst({
            where: {
                organizationId: context.organization.id,
                name,
                id: { not: profileId },
            },
            select: { id: true },
        }),
    ]);

    if (!profile || duplicateProfile) return;

    const effectiveSelectedModules = profile.systemKey === "ADMIN"
        ? new Set(PROFILE_PERMISSION_MODULES)
        : selectedModules;

    await prisma.$transaction(async (tx) => {
        await tx.organizationProfile.update({
            where: { id: profile.id },
            data: {
                name,
                description: description || null,
            },
        });

        for (const moduleKey of PROFILE_PERMISSION_MODULES) {
            await tx.organizationProfilePermission.upsert({
                where: {
                    organizationProfileId_moduleKey: {
                        organizationProfileId: profile.id,
                        moduleKey: moduleKey as PrismaSaaSModuleKey,
                    },
                },
                create: {
                    organizationProfileId: profile.id,
                    moduleKey: moduleKey as PrismaSaaSModuleKey,
                    enabled: effectiveSelectedModules.has(moduleKey),
                },
                update: { enabled: effectiveSelectedModules.has(moduleKey) },
            });
        }
    }, { timeout: 20_000 });

    await prisma.securityAuditLog.create({
        data: {
            organizationId: context.organization.id,
            userId: context.user.id,
            action: "settings.profile.updated",
            riskLevel: "INFO",
            metadata: settingsAuditMetadata({
                profileId: profile.id,
                previousProfileName: profile.name,
                profileName: name,
                enabledModules: Array.from(effectiveSelectedModules),
            }),
        },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
}
