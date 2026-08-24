'use server'

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { getCurrentSaaSContext, ModuleAccessError, requireModuleAccess } from "@/features/saas/services/entitlements";
import { normalizeIngredientSearchText } from "@/features/ingredients/domain/ingredient-search";
import { consumeRequestRateLimit, getRequestRateLimit } from "@/lib/security/request-rate-limit";
import {
    customIngredientListDtoSelect,
    toCustomIngredientListDto,
} from "@/features/ingredients/services/ingredient-dto";

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

const IMPORT_NUMERIC_FIELDS = [
    "energy", "protein", "carbs", "fatTotal", "fatSat", "fatTrans", "fiber", "sodium",
    "sugarTotal", "sugarAdded", "fatMono", "fatPoly", "omega6", "omega3", "cholesterol",
    "vitaminA", "vitaminD", "vitaminE", "vitaminK", "vitaminC", "thiamin", "riboflavin",
    "niacin", "vitaminB6", "biotin", "folicAcid", "pantothenicAcid", "vitaminB12",
    "calcium", "chloride", "copper", "chromium", "iron", "fluoride", "phosphorus", "iodine",
    "magnesium", "manganese", "molybdenum", "potassium", "selenium", "zinc", "choline",
] as const satisfies readonly (keyof IngredientData)[];

function sanitizeImportedIngredients(value: unknown) {
    if (!Array.isArray(value) || value.length === 0 || value.length > 1000) return null;

    const sanitized: IngredientData[] = [];
    for (const item of value) {
        if (!item || typeof item !== "object" || Array.isArray(item)) return null;
        const input = item as Record<string, unknown>;
        const name = typeof input.name === "string" ? input.name.trim() : "";
        if (name.length < 1 || name.length > 160) return null;

        const row = { name } as IngredientData;
        for (const field of IMPORT_NUMERIC_FIELDS) {
            const numeric = input[field];
            if (typeof numeric !== "number" || !Number.isFinite(numeric) || numeric < 0 || numeric > 1_000_000_000) {
                return null;
            }
            row[field] = numeric;
        }
        sanitized.push(row);
    }

    return sanitized;
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

    try {
        await requireModuleAccess(SAAS_MODULES.CUSTOM_INGREDIENTS);
    } catch {
        return [];
    }

    const context = await getCurrentSaaSContext();
    if (!context || context.user.id !== user.id) return [];

    const ingredients = await prisma.customIngredient.findMany({
        where: { organizationId: context.organization.id },
        select: customIngredientListDtoSelect,
        orderBy: { createdAt: 'desc' },
        take: 200,
    });
    return ingredients.map(toCustomIngredientListDto);
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
        const safeIngredients = sanitizeImportedIngredients(ingredients);
        if (!safeIngredients) return { error: "Dados de importação inválidos." };

        const requestLimit = await consumeRequestRateLimit(
            "ingredient_writes",
            user.id,
            getRequestRateLimit("ingredientWrites"),
        );
        if (!requestLimit.allowed) return { error: "Limite temporário de importações atingido. Tente novamente mais tarde." };

        const context = await getCurrentSaaSContext();
        if (!context || context.user.id !== user.id) return { error: "Workspace não encontrado." };

        await prisma.customIngredient.createMany({
            data: safeIngredients.map(ing => ({
                ...ing,
                searchName: normalizeIngredientSearchText(ing.name),
                userId: user.id,
                organizationId: context.organization.id,
            }))
        });

        revalidatePath('/my-ingredients');
        return { success: true, count: safeIngredients.length };
    } catch {
        return { error: "Erro ao importar ingredientes." };
    }
}
