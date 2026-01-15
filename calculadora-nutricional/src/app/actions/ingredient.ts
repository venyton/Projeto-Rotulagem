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
    const sugarAdded = parseFloat(formData.get("sugarAdded") as string) || 0;

    // Micronutrients
    const fatMono = parseFloat(formData.get("fatMono") as string) || 0;
    const fatPoly = parseFloat(formData.get("fatPoly") as string) || 0;
    const omega6 = parseFloat(formData.get("omega6") as string) || 0;
    const omega3 = parseFloat(formData.get("omega3") as string) || 0;
    const cholesterol = parseFloat(formData.get("cholesterol") as string) || 0;

    const vitaminA = parseFloat(formData.get("vitaminA") as string) || 0;
    const vitaminD = parseFloat(formData.get("vitaminD") as string) || 0;
    const vitaminE = parseFloat(formData.get("vitaminE") as string) || 0;
    const vitaminK = parseFloat(formData.get("vitaminK") as string) || 0;
    const vitaminC = parseFloat(formData.get("vitaminC") as string) || 0;
    const thiamin = parseFloat(formData.get("thiamin") as string) || 0;
    const riboflavin = parseFloat(formData.get("riboflavin") as string) || 0;
    const niacin = parseFloat(formData.get("niacin") as string) || 0;
    const vitaminB6 = parseFloat(formData.get("vitaminB6") as string) || 0;
    const biotin = parseFloat(formData.get("biotin") as string) || 0;
    const folicAcid = parseFloat(formData.get("folicAcid") as string) || 0;
    const pantothenicAcid = parseFloat(formData.get("pantothenicAcid") as string) || 0;
    const vitaminB12 = parseFloat(formData.get("vitaminB12") as string) || 0;

    const calcium = parseFloat(formData.get("calcium") as string) || 0;
    const chloride = parseFloat(formData.get("chloride") as string) || 0;
    const copper = parseFloat(formData.get("copper") as string) || 0;
    const chromium = parseFloat(formData.get("chromium") as string) || 0;
    const iron = parseFloat(formData.get("iron") as string) || 0;
    const fluoride = parseFloat(formData.get("fluoride") as string) || 0;
    const phosphorus = parseFloat(formData.get("phosphorus") as string) || 0;
    const iodine = parseFloat(formData.get("iodine") as string) || 0;
    const magnesium = parseFloat(formData.get("magnesium") as string) || 0;
    const manganese = parseFloat(formData.get("manganese") as string) || 0;
    const molybdenum = parseFloat(formData.get("molybdenum") as string) || 0;
    const potassium = parseFloat(formData.get("potassium") as string) || 0;
    const selenium = parseFloat(formData.get("selenium") as string) || 0;
    const zinc = parseFloat(formData.get("zinc") as string) || 0;
    const choline = parseFloat(formData.get("choline") as string) || 0;

    if (!name) return { error: "Nome é obrigatório" };

    try {
        await prisma.customIngredient.create({
            data: {
                userId: user.id,
                name: `[Meu] ${name}`, // Prefix as requested
                energy, carbs, protein, fatTotal, fatSat, fatTrans, fiber, sodium, sugarTotal, sugarAdded,
                fatMono, fatPoly, omega6, omega3, cholesterol,
                vitaminA, vitaminD, vitaminE, vitaminK, vitaminC, thiamin, riboflavin, niacin, vitaminB6, biotin, folicAcid, pantothenicAcid, vitaminB12,
                calcium, chloride, copper, chromium, iron, fluoride, phosphorus, iodine, magnesium, manganese, molybdenum, potassium, selenium, zinc, choline
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

export async function updateCustomIngredient(id: string, prevState: unknown, formData: FormData): Promise<{ error?: string; success?: boolean }> {
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
    const sugarAdded = parseFloat(formData.get("sugarAdded") as string) || 0;

    // Micronutrients
    const fatMono = parseFloat(formData.get("fatMono") as string) || 0;
    const fatPoly = parseFloat(formData.get("fatPoly") as string) || 0;
    const omega6 = parseFloat(formData.get("omega6") as string) || 0;
    const omega3 = parseFloat(formData.get("omega3") as string) || 0;
    const cholesterol = parseFloat(formData.get("cholesterol") as string) || 0;

    const vitaminA = parseFloat(formData.get("vitaminA") as string) || 0;
    const vitaminD = parseFloat(formData.get("vitaminD") as string) || 0;
    const vitaminE = parseFloat(formData.get("vitaminE") as string) || 0;
    const vitaminK = parseFloat(formData.get("vitaminK") as string) || 0;
    const vitaminC = parseFloat(formData.get("vitaminC") as string) || 0;
    const thiamin = parseFloat(formData.get("thiamin") as string) || 0;
    const riboflavin = parseFloat(formData.get("riboflavin") as string) || 0;
    const niacin = parseFloat(formData.get("niacin") as string) || 0;
    const vitaminB6 = parseFloat(formData.get("vitaminB6") as string) || 0;
    const biotin = parseFloat(formData.get("biotin") as string) || 0;
    const folicAcid = parseFloat(formData.get("folicAcid") as string) || 0;
    const pantothenicAcid = parseFloat(formData.get("pantothenicAcid") as string) || 0;
    const vitaminB12 = parseFloat(formData.get("vitaminB12") as string) || 0;

    const calcium = parseFloat(formData.get("calcium") as string) || 0;
    const chloride = parseFloat(formData.get("chloride") as string) || 0;
    const copper = parseFloat(formData.get("copper") as string) || 0;
    const chromium = parseFloat(formData.get("chromium") as string) || 0;
    const iron = parseFloat(formData.get("iron") as string) || 0;
    const fluoride = parseFloat(formData.get("fluoride") as string) || 0;
    const phosphorus = parseFloat(formData.get("phosphorus") as string) || 0;
    const iodine = parseFloat(formData.get("iodine") as string) || 0;
    const magnesium = parseFloat(formData.get("magnesium") as string) || 0;
    const manganese = parseFloat(formData.get("manganese") as string) || 0;
    const molybdenum = parseFloat(formData.get("molybdenum") as string) || 0;
    const potassium = parseFloat(formData.get("potassium") as string) || 0;
    const selenium = parseFloat(formData.get("selenium") as string) || 0;
    const zinc = parseFloat(formData.get("zinc") as string) || 0;
    const choline = parseFloat(formData.get("choline") as string) || 0;

    if (!name) return { error: "Nome é obrigatório" };

    try {
        const ing = await prisma.customIngredient.findUnique({ where: { id } });
        if (!ing || ing.userId !== user.id) return { error: "Não encontrado ou sem permissão" };

        await prisma.customIngredient.update({
            where: { id },
            data: {
                name, energy, carbs, protein, fatTotal, fatSat, fatTrans, fiber, sodium, sugarTotal, sugarAdded,
                fatMono, fatPoly, omega6, omega3, cholesterol,
                vitaminA, vitaminD, vitaminE, vitaminK, vitaminC, thiamin, riboflavin, niacin, vitaminB6, biotin, folicAcid, pantothenicAcid, vitaminB12,
                calcium, chloride, copper, chromium, iron, fluoride, phosphorus, iodine, magnesium, manganese, molybdenum, potassium, selenium, zinc, choline
            }
        });

        revalidatePath("/dashboard/ingredients");
        return { success: true };
    } catch (_e) {
        return { error: "Erro ao atualizar ingrediente" };
    }
}
