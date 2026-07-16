'use server'

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hash, compare } from "bcryptjs";
import { PASSWORD_HASH_ROUNDS, validatePasswordStrength } from "@/lib/security/password";
import {
    createTotpQrCodeDataUrl,
    createTotpSetup,
    decryptTotpSecret,
    encryptTotpSecret,
    formatTotpSecret,
    verifyTotpCode,
} from "@/lib/security/totp";
import {
    clearPersistentRateLimit,
    isPersistentRateLimited,
    recordPersistentRateLimitFailure,
} from "@/lib/security/persistent-rate-limit";

type ProfileResult = { error?: string; success?: string; requireRelogin?: boolean };
export type ProfileInfo = { name: string; email: string; twoFactorEnabled: boolean };
export type TwoFactorActionState = {
    error?: string;
    success?: string;
    qrCodeDataUrl?: string;
    manualSecret?: string;
    enabled?: boolean;
    disabled?: boolean;
};

async function getCurrentUser() {
    const session = await getServerSession(authOptions);
    if (!session) return null;

    const sessionUser = session.user as { id?: string; email?: string | null } | undefined;
    const sessionUserId = sessionUser?.id;
    const sessionUserEmail = sessionUser?.email || null;

    if (sessionUserId) {
        const byId = await prisma.user.findUnique({ where: { id: sessionUserId } });
        if (byId) return byId;
    }

    if (sessionUserEmail) {
        return prisma.user.findUnique({ where: { email: sessionUserEmail } });
    }

    return null;
}

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

async function isSensitiveActionBlocked(scope: string, userId: string) {
    return isPersistentRateLimited(`profile.${scope}`, userId, 8);
}

async function recordSensitiveFailure(scope: string, userId: string) {
    await recordPersistentRateLimitFailure(`profile.${scope}`, userId, 15 * 60 * 1000);
}

async function clearSensitiveFailures(scope: string, userId: string) {
    await clearPersistentRateLimit(`profile.${scope}`, userId);
}

function getFormValue(formData: FormData, key: string) {
    return ((formData.get(key) as string | null) ?? "").trim();
}

async function validateCurrentPassword(user: CurrentUser, password: string) {
    if (!password) return "Informe sua senha atual.";
    if (!user.password) return "Esta conta usa login externo. Cadastre uma senha antes de confirmar com senha.";
    const isValid = await compare(password, user.password);
    return isValid ? null : "Senha atual incorreta.";
}

async function validateUserTwoFactorCode(user: CurrentUser, code: string) {
    if (!user.twoFactorEnabled) return null;
    if (!code) return "Informe o código 2FA.";
    if (!user.twoFactorSecret) return "2FA inconsistente. Desative e configure novamente.";

    try {
        const secret = decryptTotpSecret(user.twoFactorSecret);
        return (await verifyTotpCode(secret, code)) ? null : "Código 2FA inválido.";
    } catch {
        return "2FA inconsistente. Desative e configure novamente.";
    }
}

export async function getProfileInfo(): Promise<ProfileInfo | null> {
    const user = await getCurrentUser();
    if (!user) return null;
    return {
        name: user.name ?? "",
        email: user.email,
        twoFactorEnabled: Boolean(user.twoFactorEnabled && user.twoFactorSecret),
    };
}

export async function updateProfileInfo(prevState: unknown, formData: FormData): Promise<ProfileResult> {
    const user = await getCurrentUser();
    if (!user) return { error: "Não autorizado" };

    const name = (formData.get("name") as string | null)?.trim() ?? "";
    const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
    const currentPassword = getFormValue(formData, "profileCurrentPassword");
    const twoFactorCode = getFormValue(formData, "profileTwoFactorCode");

    if (!email) return { error: "Email é obrigatório." };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return { error: "Informe um email válido." };

    if (name && name.length < 2) return { error: "O nome deve ter pelo menos 2 caracteres." };
    if (name.length > 80) return { error: "O nome deve ter no máximo 80 caracteres." };

    const emailOwner = await prisma.user.findUnique({ where: { email } });
    if (emailOwner && emailOwner.id !== user.id) {
        return { error: "Este email já está sendo utilizado por outra conta." };
    }

    const emailChanged = email !== user.email;

    if (emailChanged) {
        const passwordError = await validateCurrentPassword(user, currentPassword);
        if (passwordError) return { error: passwordError };

        const twoFactorError = await validateUserTwoFactorCode(user, twoFactorCode);
        if (twoFactorError) return { error: twoFactorError };
    }

    await prisma.user.update({
        where: { id: user.id },
        data: {
            name: name || null,
            email,
        },
    });

    return {
        success: emailChanged
            ? "Dados atualizados. Por segurança, faça login novamente para continuar."
            : "Dados atualizados com sucesso.",
        requireRelogin: emailChanged,
    };
}

export async function changePassword(prevState: unknown, formData: FormData): Promise<ProfileResult> {
    const user = await getCurrentUser();
    if (!user) return { error: "Não autorizado" };
    const scope = "change_password";
    if (await isSensitiveActionBlocked(scope, user.id)) return { error: "Muitas tentativas. Tente novamente mais tarde." };

    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const twoFactorCode = getFormValue(formData, "twoFactorCode");

    if (!currentPassword || !newPassword || !confirmPassword) {
        return { error: "Preencha todos os campos de senha." };
    }
    if (newPassword !== confirmPassword) return { error: "As senhas não coincidem" };
    const passwordError = validatePasswordStrength(newPassword, { email: user.email, name: user.name });
    if (passwordError) return { error: passwordError };

    const currentPasswordError = await validateCurrentPassword(user, currentPassword);
    if (currentPasswordError) {
        await recordSensitiveFailure(scope, user.id);
        return { error: currentPasswordError };
    }

    const twoFactorError = await validateUserTwoFactorCode(user, twoFactorCode);
    if (twoFactorError) {
        await recordSensitiveFailure(scope, user.id);
        return { error: twoFactorError };
    }

    const samePassword = user.password ? await compare(newPassword, user.password) : false;
    if (samePassword) return { error: "A nova senha precisa ser diferente da senha atual." };

    const hashedPassword = await hash(newPassword, PASSWORD_HASH_ROUNDS);

    await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
    });

    await clearSensitiveFailures(scope, user.id);

    return { success: "Senha alterada com sucesso!" };
}

export async function startTwoFactorSetup(
    prevState: unknown,
    formData: FormData
): Promise<TwoFactorActionState> {
    const user = await getCurrentUser();
    if (!user) return { error: "Não autorizado" };
    if (user.twoFactorEnabled) return { error: "2FA já está ativo nesta conta." };
    const scope = "start_2fa";
    if (await isSensitiveActionBlocked(scope, user.id)) return { error: "Muitas tentativas. Tente novamente mais tarde." };

    const currentPassword = getFormValue(formData, "currentPassword");
    const passwordError = await validateCurrentPassword(user, currentPassword);
    if (passwordError) {
        await recordSensitiveFailure(scope, user.id);
        return { error: passwordError };
    }

    try {
        const setup = createTotpSetup(user.email);
        const encryptedSecret = encryptTotpSecret(setup.secret);
        const qrCodeDataUrl = await createTotpQrCodeDataUrl(setup.otpauthUrl);

        await prisma.user.update({
            where: { id: user.id },
            data: { twoFactorPendingSecret: encryptedSecret },
        });

        await clearSensitiveFailures(scope, user.id);

        return {
            success: "Escaneie o QR Code e confirme o primeiro código.",
            qrCodeDataUrl,
            manualSecret: formatTotpSecret(setup.secret),
        };
    } catch {
        return { error: "Não foi possível iniciar o 2FA. Confira a configuração segura do sistema." };
    }
}

export async function confirmTwoFactorSetup(
    prevState: unknown,
    formData: FormData
): Promise<TwoFactorActionState> {
    const user = await getCurrentUser();
    if (!user) return { error: "Não autorizado" };
    if (user.twoFactorEnabled) return { error: "2FA já está ativo nesta conta.", enabled: true };
    const scope = "confirm_2fa";
    if (await isSensitiveActionBlocked(scope, user.id)) return { error: "Muitas tentativas. Tente novamente mais tarde." };

    const currentPassword = getFormValue(formData, "confirmCurrentPassword");
    const code = getFormValue(formData, "setupCode");

    const passwordError = await validateCurrentPassword(user, currentPassword);
    if (passwordError) {
        await recordSensitiveFailure(scope, user.id);
        return { error: passwordError };
    }
    if (!user.twoFactorPendingSecret) return { error: "Gere um QR Code antes de confirmar." };

    try {
        const secret = decryptTotpSecret(user.twoFactorPendingSecret);
        if (!(await verifyTotpCode(secret, code))) {
            await recordSensitiveFailure(scope, user.id);
            return { error: "Código 2FA inválido." };
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                twoFactorEnabled: true,
                twoFactorSecret: user.twoFactorPendingSecret,
                twoFactorPendingSecret: null,
                twoFactorConfirmedAt: new Date(),
            },
        });

        await clearSensitiveFailures(scope, user.id);

        return { success: "2FA ativado com sucesso.", enabled: true };
    } catch {
        return { error: "Não foi possível confirmar o 2FA. Gere um novo QR Code." };
    }
}

export async function disableTwoFactor(
    prevState: unknown,
    formData: FormData
): Promise<TwoFactorActionState> {
    const user = await getCurrentUser();
    if (!user) return { error: "Não autorizado" };
    if (!user.twoFactorEnabled) return { success: "2FA já está desativado.", disabled: true };
    const scope = "disable_2fa";
    if (await isSensitiveActionBlocked(scope, user.id)) return { error: "Muitas tentativas. Tente novamente mais tarde." };

    const currentPassword = getFormValue(formData, "disableCurrentPassword");
    const code = getFormValue(formData, "disableTwoFactorCode");

    const passwordError = await validateCurrentPassword(user, currentPassword);
    if (passwordError) {
        await recordSensitiveFailure(scope, user.id);
        return { error: passwordError };
    }

    const twoFactorError = await validateUserTwoFactorCode(user, code);
    if (twoFactorError) {
        await recordSensitiveFailure(scope, user.id);
        return { error: twoFactorError };
    }

    await prisma.user.update({
        where: { id: user.id },
        data: {
            twoFactorEnabled: false,
            twoFactorSecret: null,
            twoFactorPendingSecret: null,
            twoFactorConfirmedAt: null,
            twoFactorLastUsedAt: null,
        },
    });

    await clearSensitiveFailures(scope, user.id);

    return { success: "2FA desativado.", disabled: true };
}
