'use server'

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hash, compare } from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function changePassword(prevState: any, formData: FormData): Promise<{ error?: string; success?: string }> {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) return { error: "Não autorizado" };

    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) return { error: "As senhas não coincidem" };
    if (newPassword.length < 6) return { error: "A nova senha deve ter pelo menos 6 caracteres" };

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return { error: "Usuário não encontrado" };

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
