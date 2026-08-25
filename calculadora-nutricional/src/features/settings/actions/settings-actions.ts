"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { OrganizationKind, OrganizationRole, SaaSModuleKey as PrismaSaaSModuleKey } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { PASSWORD_HASH_ROUNDS, validatePasswordStrength } from "@/lib/security/password";
import { consumeRequestRateLimit, getRequestRateLimit } from "@/lib/security/request-rate-limit";
import { isSaaSModuleKey } from "@/features/saas/domain/modules";
import { contextHasModuleAccess, getCurrentSaaSContext } from "@/features/saas/services/entitlements";
import { PROFILE_PERMISSION_MODULES } from "@/features/settings/domain/profile-permissions";
import {
    canManageAllOrganizationUsers,
    canManageOrganizationSettings,
    ensureOrganizationProfiles,
    settingsAuditMetadata,
    syncGlobalProfilesAcrossActiveOrganizations,
} from "@/features/settings/services/organization-settings";
import {
    hashBrazilianDocument,
    lastFourDigits,
} from "@/features/organizations/domain/brazilian-documents";
import { validateOrganizationIdentity } from "@/features/organizations/domain/organization-identity";
import { isValidCpf } from "@/features/organizations/domain/brazilian-documents";
import { isValidEmail, normalizeEmail } from "@/lib/validation/contacts";
import { isDatabaseId } from "@/lib/validation/identifiers";
import { canResetManagedMemberPassword } from "@/features/settings/domain/credential-management";
import {
    canGrantManagedProfilePermissions,
    canManageOrganizationMember,
} from "@/features/settings/domain/credential-management";

async function requireSettingsContext() {
    const context = await getCurrentSaaSContext();
    if (!context || !canManageOrganizationSettings(context)) {
        throw new Error("Sem permissão para alterar configurações.");
    }

    return context;
}

async function canWriteSettings(userId: string) {
    const rateLimit = await consumeRequestRateLimit(
        "settings-write",
        userId,
        getRequestRateLimit("workspaceWrites"),
    );
    return rateLimit.allowed;
}

function actorProfilePermissions(context: Awaited<ReturnType<typeof requireSettingsContext>>) {
    return PROFILE_PERMISSION_MODULES.filter((moduleKey) => contextHasModuleAccess(context, moduleKey));
}

function canGrantProfilePermissions(
    context: Awaited<ReturnType<typeof requireSettingsContext>>,
    permissions: Array<{ moduleKey: PrismaSaaSModuleKey; enabled: boolean }>,
) {
    return canGrantManagedProfilePermissions({
        hasGlobalAuthority: canManageAllOrganizationUsers(context),
        actorRole: context.member.role,
        actorPermissions: actorProfilePermissions(context),
        requestedPermissions: permissions.filter((permission) => permission.enabled).map((permission) => permission.moduleKey),
    });
}

function canGrantSelectedModules(
    context: Awaited<ReturnType<typeof requireSettingsContext>>,
    selectedModules: ReadonlySet<string>,
) {
    return canGrantManagedProfilePermissions({
        hasGlobalAuthority: canManageAllOrganizationUsers(context),
        actorRole: context.member.role,
        actorPermissions: actorProfilePermissions(context),
        requestedPermissions: [...selectedModules],
    });
}

function redirectUserError(error: string): never {
    redirect(`/dashboard/settings?tab=users&userError=${error}`);
}

function redirectSettingsError(tab: "organizations" | "users" | "profiles", error: string): never {
    redirect(`/dashboard/settings?tab=${tab}&settingsError=${error}`);
}

function isIdentifier(value: string) {
    return isDatabaseId(value);
}

function managementTab(formData: FormData, fallback: "organizations" | "users" | "profiles" = "users") {
    const tab = String(formData.get("managementTab") || "");
    return tab === "organizations" || tab === "users" || tab === "profiles" ? tab : fallback;
}

function managementRedirect(tab: "organizations" | "users" | "profiles", params: Record<string, string> = {}): never {
    const searchParams = new URLSearchParams({ tab, ...params });
    redirect(`/dashboard/settings?${searchParams.toString()}`);
}

async function resolveManagedOrganizationId(context: Awaited<ReturnType<typeof requireSettingsContext>>, rawOrganizationId: FormDataEntryValue | null) {
    const organizationId = String(rawOrganizationId || "").trim();
    if (!organizationId || organizationId === context.organization.id) return context.organization.id;
    if (!isIdentifier(organizationId) || !canManageAllOrganizationUsers(context)) return null;

    const organization = await prisma.organization.findFirst({
        where: { id: organizationId, status: "ACTIVE" },
        select: { id: true },
    });
    return organization?.id ?? null;
}

function normalizeSlug(value: string) {
    return value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 42) || "organizacao";
}

async function createUniqueOrganizationSlug(name: string) {
    const base = normalizeSlug(name);
    for (let attempt = 0; attempt < 8; attempt += 1) {
        const slug = `${base}-${randomBytes(3).toString("hex")}`;
        const existing = await prisma.organization.findUnique({ where: { slug }, select: { id: true } });
        if (!existing) return slug;
    }
    return `${base}-${Date.now().toString(36)}`;
}

export async function createManagedOrganization(formData: FormData) {
    const context = await requireSettingsContext();
    if (!canManageAllOrganizationUsers(context)) redirectSettingsError("organizations", "forbidden");
    if (!await canWriteSettings(context.user.id)) redirectSettingsError("organizations", "rate_limit");

    const identity = validateOrganizationIdentity({
        kind: formData.get("kind"),
        personName: formData.get("personName"),
        cpf: formData.get("cpf"),
        legalName: formData.get("legalName"),
        tradeName: formData.get("tradeName"),
        cnpj: formData.get("cnpj"),
    });
    if (!identity.success) redirectSettingsError("organizations", identity.error);

    const { personName, cpf, legalName, tradeName, cnpj } = identity.data;
    const kind = identity.data.kind === "COMPANY" ? OrganizationKind.COMPANY : OrganizationKind.INDIVIDUAL;
    const organizationName = kind === OrganizationKind.COMPANY ? tradeName || legalName : personName;
    const cpfHash = kind === OrganizationKind.INDIVIDUAL ? hashBrazilianDocument("CPF", cpf) : null;
    const cnpjHash = kind === OrganizationKind.COMPANY ? hashBrazilianDocument("CNPJ", cnpj) : null;
    const [duplicateCpf, duplicateCnpj] = await Promise.all([
        cpfHash ? prisma.organization.findUnique({ where: { cpfHash }, select: { id: true } }) : null,
        cnpjHash ? prisma.organization.findUnique({ where: { cnpjHash }, select: { id: true } }) : null,
    ]);
    if (duplicateCpf) redirectSettingsError("organizations", "cpf_exists");
    if (duplicateCnpj) redirectSettingsError("organizations", "cnpj_exists");

    const organization = await prisma.organization.create({
        data: {
            ownerId: context.user.id,
            name: organizationName,
            slug: await createUniqueOrganizationSlug(organizationName),
            kind,
            cpfHash,
            cpfLastFour: cpf ? lastFourDigits(cpf) : null,
            legalName: kind === OrganizationKind.COMPANY ? legalName : null,
            tradeName: kind === OrganizationKind.COMPANY ? tradeName || null : null,
            cnpjHash,
            cnpjLastFour: cnpj ? lastFourDigits(cnpj) : null,
        },
        select: { id: true },
    });

    await ensureOrganizationProfiles(organization.id);
    const ownerProfile = await prisma.organizationProfile.findFirst({
        where: { organizationId: organization.id, systemKey: "OWNER" },
        select: { id: true },
    });
    await prisma.organizationMember.upsert({
        where: { organizationId_userId: { organizationId: organization.id, userId: context.user.id } },
        create: {
            organizationId: organization.id,
            userId: context.user.id,
            role: OrganizationRole.OWNER,
            profileId: ownerProfile?.id,
        },
        update: { role: OrganizationRole.OWNER, profileId: ownerProfile?.id },
    });

    await prisma.securityAuditLog.create({
        data: {
            organizationId: organization.id,
            userId: context.user.id,
            action: "settings.organization.created",
            riskLevel: "INFO",
            metadata: settingsAuditMetadata({ kind, hasCpf: Boolean(cpfHash), hasCnpj: Boolean(cnpjHash) }),
        },
    });

    revalidatePath("/dashboard/settings");
    managementRedirect("organizations", { organization: organization.id, organizationCreated: "1" });
}

export async function createOrganizationUser(formData: FormData) {
    const context = await requireSettingsContext();
    if (!await canWriteSettings(context.user.id)) redirectUserError("rate_limit");
    const tab = managementTab(formData);
    const organizationId = await resolveManagedOrganizationId(context, formData.get("organizationId"));
    if (!organizationId) managementRedirect(tab, { userError: "organization" });
    await ensureOrganizationProfiles(organizationId);
    const name = String(formData.get("name") || "").trim();
    const email = normalizeEmail(String(formData.get("email") || ""));
    const password = String(formData.get("password") || "");
    const cpf = String(formData.get("cpf") || "");
    const profileId = String(formData.get("profileId") || "");

    if (name.length < 2 || name.length > 80) redirectUserError("invalid");
    if (!isValidEmail(email)) redirectUserError("invalid");
    if (!isValidCpf(cpf)) redirectUserError("cpf");

    const passwordError = validatePasswordStrength(password, { email, name });
    if (passwordError) redirectUserError("password");

    const cpfHash = hashBrazilianDocument("CPF", cpf);
    const [existingUser, existingCpf, profile] = await Promise.all([
        prisma.user.findUnique({
            where: { email },
            select: { id: true },
        }),
        prisma.user.findUnique({
            where: { cpfHash },
            select: { id: true },
        }),
        prisma.organizationProfile.findFirst({
            where: {
                id: profileId,
                organizationId,
            },
            select: {
                id: true,
                name: true,
                permissions: { select: { moduleKey: true, enabled: true } },
            },
        }),
    ]);

    if (existingUser || existingCpf) redirectUserError("exists");
    if (!profile || !canGrantProfilePermissions(context, profile.permissions)) redirectUserError("profile");

    const hashedPassword = await hash(password, PASSWORD_HASH_ROUNDS);

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            cpfHash,
            cpfLastFour: lastFourDigits(cpf),
            organizationMemberships: {
                create: {
                    organizationId,
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
            organizationId,
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
    managementRedirect(tab, {
        ...(tab === "organizations" ? { organization: organizationId } : {}),
        userCreated: "1",
    });
}

export async function linkExistingOrganizationUser(formData: FormData) {
    const context = await requireSettingsContext();
    if (!await canWriteSettings(context.user.id)) redirectUserError("rate_limit");
    const tab = managementTab(formData);
    const organizationId = await resolveManagedOrganizationId(context, formData.get("organizationId"));
    if (!organizationId) managementRedirect(tab, { userError: "organization" });
    await ensureOrganizationProfiles(organizationId);

    const email = normalizeEmail(String(formData.get("email") || ""));
    const profileId = String(formData.get("profileId") || "");
    if (!isValidEmail(email)) redirectUserError("invalid");

    const [user, profile] = await Promise.all([
        prisma.user.findUnique({ where: { email }, select: { id: true, name: true } }),
        prisma.organizationProfile.findFirst({
            where: { id: profileId, organizationId },
            select: {
                id: true,
                name: true,
                permissions: { select: { moduleKey: true, enabled: true } },
            },
        }),
    ]);
    if (!user) redirectUserError("not_found");
    if (!profile || !canGrantProfilePermissions(context, profile.permissions)) redirectUserError("profile");

    const existingMembership = await prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: user.id } },
        select: { id: true, role: true },
    });
    if (user.id === context.user.id || (existingMembership && !canManageOrganizationMember({
        hasGlobalAuthority: canManageAllOrganizationUsers(context),
        sameOrganization: organizationId === context.organization.id,
        isSelf: existingMembership.id === context.member.id,
        actorRole: context.member.role,
        targetRole: existingMembership.role,
    }))) {
        redirectUserError("forbidden");
    }

    const member = await prisma.organizationMember.upsert({
        where: {
            organizationId_userId: {
                organizationId,
                userId: user.id,
            },
        },
        create: {
            organizationId,
            userId: user.id,
            profileId: profile.id,
            role: OrganizationRole.MEMBER,
            active: true,
        },
        update: {
            profileId: profile.id,
            active: true,
        },
        select: { id: true },
    });

    await prisma.securityAuditLog.create({
        data: {
            organizationId,
            userId: context.user.id,
            action: "settings.member.linked",
            riskLevel: "INFO",
            metadata: settingsAuditMetadata({
                organizationMemberId: member.id,
                targetUserId: user.id,
                profileId: profile.id,
                profileName: profile.name,
            }),
        },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    managementRedirect(tab, {
        ...(tab === "organizations" ? { organization: organizationId } : {}),
        userLinked: "1",
    });
}

export async function updateOrganizationIdentity(formData: FormData) {
    const context = await requireSettingsContext();
    const tab = managementTab(formData);
    if (!await canWriteSettings(context.user.id)) redirectSettingsError(tab, "rate_limit");
    const organizationId = await resolveManagedOrganizationId(context, formData.get("organizationId"));
    if (!organizationId) managementRedirect(tab, { settingsError: "organization" });

    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
            kind: true,
            name: true,
            cpfHash: true,
            cpfLastFour: true,
            cnpjHash: true,
            cnpjLastFour: true,
        },
    });
    if (!organization) redirectSettingsError(tab, "invalid");
    const identity = validateOrganizationIdentity({
        kind: formData.get("kind"),
        personName: formData.get("personName"),
        cpf: formData.get("cpf"),
        legalName: formData.get("legalName"),
        tradeName: formData.get("tradeName"),
        cnpj: formData.get("cnpj"),
    }, {
        hasCpf: Boolean(organization.cpfHash),
        hasCnpj: Boolean(organization.cnpjHash),
    });
    if (!identity.success) redirectSettingsError(tab, identity.error);

    const { personName, cpf, legalName, tradeName, cnpj } = identity.data;
    const kind = identity.data.kind === "COMPANY" ? OrganizationKind.COMPANY : OrganizationKind.INDIVIDUAL;
    if (organization.kind === OrganizationKind.COMPANY && kind !== OrganizationKind.COMPANY) {
        redirectSettingsError(tab, "organization_kind");
    }

    const cpfHash = kind === OrganizationKind.INDIVIDUAL
        ? cpf ? hashBrazilianDocument("CPF", cpf) : organization.cpfHash
        : null;
    const cnpjHash = kind === OrganizationKind.COMPANY
        ? cnpj ? hashBrazilianDocument("CNPJ", cnpj) : organization.cnpjHash
        : null;
    if (cpfHash && cpfHash !== organization.cpfHash) {
        const duplicate = await prisma.organization.findUnique({ where: { cpfHash }, select: { id: true } });
        if (duplicate) redirectSettingsError(tab, "cpf_exists");
    }
    if (cnpjHash && cnpjHash !== organization.cnpjHash) {
        const duplicate = await prisma.organization.findUnique({ where: { cnpjHash }, select: { id: true } });
        if (duplicate) redirectSettingsError(tab, "cnpj_exists");
    }

    await prisma.organization.update({
        where: { id: organizationId },
        data: {
            kind,
            name: kind === OrganizationKind.COMPANY ? tradeName || legalName : personName,
            cpfHash: kind === OrganizationKind.INDIVIDUAL ? cpfHash : null,
            cpfLastFour: kind === OrganizationKind.INDIVIDUAL
                ? cpf ? lastFourDigits(cpf) : organization.cpfLastFour
                : null,
            legalName: kind === OrganizationKind.COMPANY ? legalName : null,
            tradeName: kind === OrganizationKind.COMPANY ? tradeName || null : null,
            cnpjHash: kind === OrganizationKind.COMPANY ? cnpjHash : null,
            cnpjLastFour: kind === OrganizationKind.COMPANY ? (cnpj ? lastFourDigits(cnpj) : organization.cnpjLastFour) : null,
        },
    });

    await prisma.securityAuditLog.create({
        data: {
            organizationId,
            userId: context.user.id,
            action: "settings.organization_identity.updated",
            riskLevel: "INFO",
            metadata: settingsAuditMetadata({ kind, hasCpf: Boolean(cpfHash), hasCnpj: Boolean(cnpjHash) }),
        },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    managementRedirect(tab, {
        ...(tab === "organizations" ? { organization: organizationId } : {}),
        organizationUpdated: "1",
    });
}

export async function updateMemberProfile(formData: FormData) {
    const context = await requireSettingsContext();
    if (!await canWriteSettings(context.user.id)) redirectSettingsError("users", "rate_limit");
    const memberId = String(formData.get("memberId") || "");
    const profileId = String(formData.get("profileId") || "");
    const canManageAllUsers = canManageAllOrganizationUsers(context);

    if (!isDatabaseId(memberId) || !isDatabaseId(profileId)) return;

    const targetMember = await prisma.organizationMember.findFirst({
        where: {
            id: memberId,
            ...(canManageAllUsers
                ? { organization: { status: "ACTIVE" } }
                : { organizationId: context.organization.id }),
        },
        select: {
            id: true,
            role: true,
            userId: true,
            organizationId: true,
        },
    });

    if (!targetMember) return;

    await ensureOrganizationProfiles(targetMember.organizationId);

    const targetProfile = await prisma.organizationProfile.findFirst({
        where: {
            id: profileId,
            organizationId: targetMember.organizationId,
        },
        select: {
            id: true,
            name: true,
            permissions: { select: { moduleKey: true, enabled: true } },
        },
    });

    if (!targetMember || !targetProfile) return;
    if (!canManageOrganizationMember({
        hasGlobalAuthority: canManageAllUsers,
        sameOrganization: targetMember.organizationId === context.organization.id,
        isSelf: targetMember.userId === context.user.id,
        actorRole: context.member.role,
        targetRole: targetMember.role,
    })) return;
    if (!canGrantProfilePermissions(context, targetProfile.permissions)) return;

    await prisma.organizationMember.update({
        where: { id: targetMember.id },
        data: { profileId: targetProfile.id },
    });

    await prisma.securityAuditLog.create({
        data: {
            organizationId: targetMember.organizationId,
            userId: context.user.id,
            action: "settings.member_profile.updated",
            riskLevel: "INFO",
            metadata: settingsAuditMetadata({
                organizationMemberId: targetMember.id,
                targetUserId: targetMember.userId,
                managingOrganizationId: context.organization.id,
                profileId: targetProfile.id,
                profileName: targetProfile.name,
            }),
        },
    });

    revalidatePath("/dashboard/settings");
}

async function findManageableMember(context: Awaited<ReturnType<typeof requireSettingsContext>>, rawMemberId: FormDataEntryValue | null) {
    const memberId = String(rawMemberId || "").trim();
    if (!isIdentifier(memberId)) return null;

    return prisma.organizationMember.findFirst({
        where: {
            id: memberId,
            ...(canManageAllOrganizationUsers(context)
                ? { organization: { status: "ACTIVE" } }
                : { organizationId: context.organization.id }),
        },
        select: {
            id: true,
            organizationId: true,
            userId: true,
            role: true,
            active: true,
            user: { select: { id: true, name: true, email: true, cpfHash: true } },
        },
    });
}

export async function updateManagedUser(formData: FormData) {
    const context = await requireSettingsContext();
    if (!canManageAllOrganizationUsers(context)) redirectSettingsError("users", "forbidden");
    if (!await canWriteSettings(context.user.id)) redirectSettingsError("users", "rate_limit");

    const member = await findManageableMember(context, formData.get("memberId"));
    if (!member) redirectSettingsError("users", "user_not_found");
    const name = String(formData.get("name") || "").trim();
    const email = normalizeEmail(String(formData.get("email") || ""));
    const cpf = String(formData.get("cpf") || "").trim();

    if (name.length < 2 || name.length > 80 || !isValidEmail(email)) {
        redirectSettingsError("users", "invalid");
    }
    if (cpf && !isValidCpf(cpf)) redirectSettingsError("users", "cpf");

    const cpfHash = cpf ? hashBrazilianDocument("CPF", cpf) : member.user.cpfHash;
    const [emailTaken, cpfTaken] = await Promise.all([
        prisma.user.findFirst({ where: { email, id: { not: member.userId } }, select: { id: true } }),
        cpfHash ? prisma.user.findFirst({ where: { cpfHash, id: { not: member.userId } }, select: { id: true } }) : null,
    ]);
    if (emailTaken || cpfTaken) redirectSettingsError("users", "user_exists");

    await prisma.user.update({
        where: { id: member.userId },
        data: {
            name,
            email,
            ...(cpf ? { cpfHash, cpfLastFour: lastFourDigits(cpf) } : {}),
        },
    });
    await prisma.securityAuditLog.create({
        data: {
            organizationId: member.organizationId,
            userId: context.user.id,
            action: "settings.user.updated",
            riskLevel: "INFO",
            metadata: settingsAuditMetadata({ targetUserId: member.userId, organizationMemberId: member.id }),
        },
    });

    revalidatePath("/dashboard/settings");
    managementRedirect("users", { member: member.id, userUpdated: "1" });
}

export async function resetManagedUserPassword(formData: FormData) {
    const context = await requireSettingsContext();
    if (!await canWriteSettings(context.user.id)) redirectSettingsError("users", "rate_limit");

    const member = await findManageableMember(context, formData.get("memberId"));
    if (!member) redirectSettingsError("users", "user_not_found");
    if (!canResetManagedMemberPassword({
        hasGlobalAuthority: canManageAllOrganizationUsers(context),
        sameOrganization: member.organizationId === context.organization.id,
        isSelf: member.userId === context.user.id,
        actorRole: context.member.role,
        targetRole: member.role,
    })) {
        redirectSettingsError("users", "forbidden");
    }
    const password = String(formData.get("password") || "");
    const passwordError = validatePasswordStrength(password, { email: member.user.email, name: member.user.name || undefined });
    if (passwordError) redirectSettingsError("users", "password");

    await prisma.user.update({
        where: { id: member.userId },
        data: {
            password: await hash(password, PASSWORD_HASH_ROUNDS),
            resetPasswordToken: null,
            resetPasswordExpiresAt: null,
        },
    });
    await prisma.securityAuditLog.create({
        data: {
            organizationId: member.organizationId,
            userId: context.user.id,
            action: "settings.user.password_reset",
            riskLevel: "WARN",
            metadata: settingsAuditMetadata({ targetUserId: member.userId, organizationMemberId: member.id }),
        },
    });

    revalidatePath("/dashboard/settings");
    managementRedirect("users", { member: member.id, passwordReset: "1" });
}

export async function setOrganizationMemberActive(formData: FormData) {
    const context = await requireSettingsContext();
    if (!await canWriteSettings(context.user.id)) redirectSettingsError("users", "rate_limit");
    const member = await findManageableMember(context, formData.get("memberId"));
    if (!member) redirectSettingsError("users", "user_not_found");
    const active = formData.get("active") === "true";

    if (!canManageOrganizationMember({
        hasGlobalAuthority: canManageAllOrganizationUsers(context),
        sameOrganization: member.organizationId === context.organization.id,
        isSelf: member.userId === context.user.id,
        actorRole: context.member.role,
        targetRole: member.role,
    })) {
        redirectSettingsError("users", "protected_member");
    }

    await prisma.organizationMember.update({ where: { id: member.id }, data: { active } });
    await prisma.securityAuditLog.create({
        data: {
            organizationId: member.organizationId,
            userId: context.user.id,
            action: active ? "settings.member.activated" : "settings.member.inactivated",
            riskLevel: "WARN",
            metadata: settingsAuditMetadata({ targetUserId: member.userId, organizationMemberId: member.id }),
        },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    managementRedirect("users", { member: member.id, memberStatusUpdated: "1" });
}

export async function removeOrganizationMember(formData: FormData) {
    const context = await requireSettingsContext();
    if (!await canWriteSettings(context.user.id)) redirectSettingsError("users", "rate_limit");
    const member = await findManageableMember(context, formData.get("memberId"));
    if (!member) redirectSettingsError("users", "user_not_found");
    if (!canManageOrganizationMember({
        hasGlobalAuthority: canManageAllOrganizationUsers(context),
        sameOrganization: member.organizationId === context.organization.id,
        isSelf: member.userId === context.user.id,
        actorRole: context.member.role,
        targetRole: member.role,
    }) || formData.get("confirmation") !== "REMOVER") {
        redirectSettingsError("users", "protected_member");
    }

    await prisma.$transaction(async (tx) => {
        await tx.organizationMember.delete({ where: { id: member.id } });
        await tx.securityAuditLog.create({
            data: {
                organizationId: member.organizationId,
                userId: context.user.id,
                action: "settings.member.removed",
                riskLevel: "WARN",
                metadata: settingsAuditMetadata({ targetUserId: member.userId, organizationMemberId: member.id }),
            },
        });
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    managementRedirect("users", { memberRemoved: "1" });
}

export async function createOrganizationProfile(formData: FormData) {
    const context = await requireSettingsContext();
    const tab = managementTab(formData, "profiles");
    if (!await canWriteSettings(context.user.id)) redirectSettingsError(tab, "rate_limit");
    const organizationId = await resolveManagedOrganizationId(context, formData.get("organizationId"));
    if (!organizationId) managementRedirect(tab, { settingsError: "organization" });
    await ensureOrganizationProfiles(organizationId);
    const name = String(formData.get("name") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const scope = formData.get("scope") === "GLOBAL" ? "GLOBAL" : "ORGANIZATION";
    const selectedModules = new Set(
        formData.getAll("moduleKey").map((value) => String(value)).filter(isSaaSModuleKey),
    );

    if (name.length < 2 || name.length > 60 || description.length > 500) return;
    if (!canGrantSelectedModules(context, selectedModules)) redirectSettingsError(tab, "forbidden");

    if (scope === "GLOBAL") {
        if (!canManageAllOrganizationUsers(context)) redirectSettingsError(tab, "forbidden");

        const duplicate = await prisma.organizationProfile.findFirst({
            where: { name },
            select: { id: true },
        });
        if (duplicate) redirectSettingsError(tab, "profile_name");

        const template = await prisma.globalOrganizationProfile.create({
            data: {
                name,
                description: description || null,
                permissions: {
                    createMany: {
                        data: PROFILE_PERMISSION_MODULES.map((moduleKey) => ({
                            moduleKey: moduleKey as PrismaSaaSModuleKey,
                            enabled: selectedModules.has(moduleKey),
                        })),
                    },
                },
            },
            select: { id: true, name: true },
        });

        await syncGlobalProfilesAcrossActiveOrganizations();
        const profile = await prisma.organizationProfile.findFirst({
            where: { organizationId, globalTemplateId: template.id },
            select: { id: true },
        });

        await prisma.securityAuditLog.create({
            data: {
                organizationId,
                userId: context.user.id,
                action: "settings.global_profile.created",
                riskLevel: "INFO",
                metadata: settingsAuditMetadata({ globalProfileId: template.id, profileName: template.name }),
            },
        });

        revalidatePath("/dashboard/settings");
        managementRedirect("profiles", {
            ...(canManageAllOrganizationUsers(context) ? { organization: organizationId } : {}),
            ...(profile ? { profile: profile.id } : {}),
            globalProfileCreated: "1",
        });
    }

    const existingProfile = await prisma.organizationProfile.findFirst({
        where: {
            organizationId,
            name,
        },
        select: { id: true },
    });

    if (existingProfile) return;

    const profile = await prisma.organizationProfile.create({
        data: {
            organizationId,
            name,
            description: description || null,
            systemKey: `CUSTOM_${randomUUID()}`,
            permissions: {
                createMany: {
                    data: PROFILE_PERMISSION_MODULES.map((moduleKey) => ({
                        moduleKey: moduleKey as PrismaSaaSModuleKey,
                        enabled: selectedModules.has(moduleKey),
                    })),
                },
            },
        },
        select: { id: true, name: true },
    });

    await prisma.securityAuditLog.create({
        data: {
            organizationId,
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
    managementRedirect("profiles", {
        ...(canManageAllOrganizationUsers(context) ? { organization: organizationId } : {}),
        profile: profile.id,
    });
}

export async function updateOrganizationProfile(formData: FormData) {
    const context = await requireSettingsContext();
    const tab = managementTab(formData, "profiles");
    if (!await canWriteSettings(context.user.id)) redirectSettingsError(tab, "rate_limit");
    const organizationId = await resolveManagedOrganizationId(context, formData.get("organizationId"));
    if (!organizationId) managementRedirect(tab, { settingsError: "organization" });
    await ensureOrganizationProfiles(organizationId);
    const profileId = String(formData.get("profileId") || "");
    const name = String(formData.get("name") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const selectedModules = new Set(
        formData
            .getAll("moduleKey")
            .map((value) => String(value))
            .filter(isSaaSModuleKey),
    );

    if (!isIdentifier(profileId) || name.length < 2 || name.length > 60 || description.length > 500) return;

    const [profile, duplicateProfile] = await Promise.all([
        prisma.organizationProfile.findFirst({
            where: {
                id: profileId,
                organizationId,
            },
            select: {
                id: true,
                name: true,
                systemKey: true,
                globalTemplateId: true,
                permissions: { select: { moduleKey: true, enabled: true } },
            },
        }),
        prisma.organizationProfile.findFirst({
            where: {
                organizationId,
                name,
                id: { not: profileId },
            },
            select: { id: true },
        }),
    ]);

    if (!profile || duplicateProfile) return;
    if (!canGrantProfilePermissions(context, profile.permissions)) redirectSettingsError(tab, "forbidden");

    if (
        (profile.systemKey === "OWNER" || profile.systemKey === "ADMIN") &&
        context.member.role === OrganizationRole.MEMBER &&
        !canManageAllOrganizationUsers(context)
    ) {
        redirectSettingsError(tab, "forbidden");
    }

    if (profile.globalTemplateId) {
        if (!canManageAllOrganizationUsers(context)) redirectSettingsError(tab, "forbidden");
        const duplicateGlobalName = await prisma.organizationProfile.findFirst({
            where: {
                name,
                globalTemplateId: { not: profile.globalTemplateId },
            },
            select: { id: true },
        });
        if (duplicateGlobalName) redirectSettingsError(tab, "profile_name");

        await prisma.$transaction(async (tx) => {
            await tx.globalOrganizationProfile.update({
                where: { id: profile.globalTemplateId! },
                data: { name, description: description || null },
            });

            for (const moduleKey of PROFILE_PERMISSION_MODULES) {
                await tx.globalOrganizationProfilePermission.upsert({
                    where: {
                        globalProfileId_moduleKey: {
                            globalProfileId: profile.globalTemplateId!,
                            moduleKey: moduleKey as PrismaSaaSModuleKey,
                        },
                    },
                    create: {
                        globalProfileId: profile.globalTemplateId!,
                        moduleKey: moduleKey as PrismaSaaSModuleKey,
                        enabled: selectedModules.has(moduleKey),
                    },
                    update: { enabled: selectedModules.has(moduleKey) },
                });
            }
        }, { timeout: 20_000 });

        await syncGlobalProfilesAcrossActiveOrganizations();
        await prisma.securityAuditLog.create({
            data: {
                organizationId,
                userId: context.user.id,
                action: "settings.global_profile.updated",
                riskLevel: "INFO",
                metadata: settingsAuditMetadata({ globalProfileId: profile.globalTemplateId, profileName: name }),
            },
        });
        revalidatePath("/dashboard/settings");
        managementRedirect("profiles", { organization: organizationId, profile: profile.id, globalProfileUpdated: "1" });
    }

    const effectiveSelectedModules = profile.systemKey === "ADMIN"
        ? new Set(PROFILE_PERMISSION_MODULES)
        : selectedModules;
    if (!canGrantSelectedModules(context, effectiveSelectedModules)) redirectSettingsError(tab, "forbidden");

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
            organizationId,
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
