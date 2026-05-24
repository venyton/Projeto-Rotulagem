'use server'

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { ModuleAccessError, requireModuleAccess } from "@/features/saas/services/entitlements";

export type IngredientData = {
    name: string;
    energy: number;
    protein: number;
    carbs: number;
    fatTotal: number;
    fatSat: number;
    fatTrans: number;
    fiber: number;
    sodium: number;
    sugarTotal: number;
    sugarAdded: number;

    // Micronutrients
    fatMono: number;
    fatPoly: number;
    omega6: number;
    omega3: number;
    cholesterol: number;

    vitaminA: number;
    vitaminD: number;
    vitaminE: number;
    vitaminK: number;
    vitaminC: number;
    thiamin: number;
    riboflavin: number;
    niacin: number;
    vitaminB6: number;
    biotin: number;
    folicAcid: number;
    pantothenicAcid: number;
    vitaminB12: number;

    calcium: number;
    chloride: number;
    copper: number;
    chromium: number;
    iron: number;
    fluoride: number;
    phosphorus: number;
    iodine: number;
    magnesium: number;
    manganese: number;
    molybdenum: number;
    potassium: number;
    selenium: number;
    zinc: number;
    choline: number;
}

export async function getUserIngredients() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return [];
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    });

    if (!user) return [];

    return await prisma.customIngredient.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
    });
}

export async function importIngredients(ingredients: IngredientData[]) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return { error: "Usuário não autenticado." };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    });

    if (!user) {
        return { error: "Usuário não encontrado." };
    }

    try {
        await requireModuleAccess(SAAS_MODULES.CUSTOM_INGREDIENTS);
    } catch (error) {
        if (error instanceof ModuleAccessError) return { error: error.message };
        throw error;
    }

    try {
        await prisma.customIngredient.createMany({
            data: ingredients.map(ing => ({
                ...ing,
                userId: user.id
            }))
        });

        revalidatePath('/my-ingredients');
        return { success: true, count: ingredients.length };
    } catch {
        return { error: "Erro ao importar ingredientes." };
    }
}
