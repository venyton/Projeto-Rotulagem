'use server'

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hash, compare } from "bcryptjs";

type ProfileResult = { error?: string; success?: string; requireRelogin?: boolean };

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

export async function getProfileInfo(): Promise<{ name: string; email: string } | null> {
    const user = await getCurrentUser();
    if (!user) return null;
    return {
        name: user.name ?? "",
        email: user.email,
    };
}

export async function updateProfileInfo(prevState: unknown, formData: FormData): Promise<ProfileResult> {
    const user = await getCurrentUser();
    if (!user) return { error: "Não autorizado" };

    const name = (formData.get("name") as string | null)?.trim() ?? "";
    const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";

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

    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return { error: "Preencha todos os campos de senha." };
    }
    if (newPassword !== confirmPassword) return { error: "As senhas não coincidem" };
    if (newPassword.length < 6) return { error: "A nova senha deve ter pelo menos 6 caracteres" };

    // Verify current
    const isValid = await compare(currentPassword, user.password);
    if (!isValid) return { error: "Senha atual incorreta" };

    const hashedPassword = await hash(newPassword, 10);

    await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
    });

    return { success: "Senha alterada com sucesso!" };
}
