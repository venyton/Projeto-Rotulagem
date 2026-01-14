'use server'

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createCustomIngredient(prevState: unknown, formData: FormData): Promise<{ error?: string; success?: boolean }> {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) return { error: "Não autorizado" };

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return { error: "Usuário não encontrado" };

    const name = formData.get("name") as string;
    const energy = parseFloat(formData.get("energy") as string) || 0;
    const carbs = parseFloat(formData.get("carbs") as string) || 0;
    const protein = parseFloat(formData.get("protein") as string) || 0;
    const fatTotal = parseFloat(formData.get("fatTotal") as string) || 0;
    const fatSat = parseFloat(formData.get("fatSat") as string) || 0;
    const fatTrans = parseFloat(formData.get("fatTrans") as string) || 0;
    const fiber = parseFloat(formData.get("fiber") as string) || 0;
    const sodium = parseFloat(formData.get("sodium") as string) || 0;
    const sugarTotal = parseFloat(formData.get("sugarTotal") as string) || 0;

    if (!name) return { error: "Nome é obrigatório" };

    try {
        await prisma.customIngredient.create({
            data: {
                userId: user.id,
                name: `[Meu] ${name}`, // Prefix as requested
                energy,
                carbs,
                protein,
                fatTotal,
                fatSat,
                fatTrans,
                fiber,
                sodium,
                sugarTotal
            }
        });

        revalidatePath("/dashboard/ingredients");
        return { success: true };
    } catch (_e) {
        return { error: "Erro ao criar ingrediente" };
    }
}

export async function deleteCustomIngredient(id: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) return { error: "Não autorizado" };

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return { error: "Usuário não encontrado" };

    try {
        // Ensure ownership
        const ing = await prisma.customIngredient.findUnique({ where: { id } });
        if (!ing || ing.userId !== user.id) return { error: "Não encontrado ou sem permissão" };

        await prisma.customIngredient.delete({ where: { id } });
        revalidatePath("/dashboard/ingredients");
        return { success: true };
    } catch (_e) {
        return { error: "Erro ao deletar" };
    }
}
