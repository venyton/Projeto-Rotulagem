'use server'

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { ModuleAccessError, requireModuleAccess } from "@/features/saas/services/entitlements";
import { MICRO_KEYS } from "@/features/tables/domain/micronutrients";

async function requireCustomIngredientsModule() {
    try {
        await requireModuleAccess(SAAS_MODULES.CUSTOM_INGREDIENTS);
        return null;
    } catch (error) {
        if (error instanceof ModuleAccessError) return error.message;
        throw error;
    }
}

function optionalNumber(formData: FormData, key: string) {
    const value = formData.get(key);
    if (typeof value !== "string" || value.trim() === "") return null;
    const normalized = value.replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function optionalMicronutrientPayload(formData: FormData) {
    return Object.fromEntries(MICRO_KEYS.map((key) => [key, optionalNumber(formData, key)]));
}

export async function createCustomIngredient(prevState: unknown, formData: FormData): Promise<{ error?: string; success?: boolean }> {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) return { error: "Não autorizado" };

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return { error: "Usuário não encontrado" };
    const moduleError = await requireCustomIngredientsModule();
    if (moduleError) return { error: moduleError };

    const name = formData.get("name") as string;
    const energy = optionalNumber(formData, "energy") || 0;
    const carbs = optionalNumber(formData, "carbs") || 0;
    const protein = optionalNumber(formData, "protein") || 0;
    const fatTotal = optionalNumber(formData, "fatTotal") || 0;
    const fatSat = optionalNumber(formData, "fatSat") || 0;
    const fatTrans = optionalNumber(formData, "fatTrans") || 0;
    const fiber = optionalNumber(formData, "fiber") || 0;
    const sodium = optionalNumber(formData, "sodium") || 0;
    const sugarTotal = optionalNumber(formData, "sugarTotal") || 0;
    const sugarAdded = optionalNumber(formData, "sugarAdded") || 0;
    const ingredientsText = formData.get("ingredientsText") as string || null;
    const allergensText = formData.get("allergensText") as string || null;
    const glutenText = formData.get("glutenText") as string || null;
    const containsGlutenRaw = formData.get("containsGluten") as string;
    const containsGluten = containsGlutenRaw === "true" ? true : containsGlutenRaw === "false" ? false : null;
    const customNutrientsRaw = formData.get("customNutrients") as string;
    const customNutrients = customNutrientsRaw ? JSON.parse(customNutrientsRaw) : undefined;


    // Micronutrients
    const fatMono = optionalNumber(formData, "fatMono");
    const fatPoly = optionalNumber(formData, "fatPoly");
    const omega6 = optionalNumber(formData, "omega6");
    const omega3 = optionalNumber(formData, "omega3");
    const cholesterol = optionalNumber(formData, "cholesterol");

    const vitaminA = optionalNumber(formData, "vitaminA");
    const vitaminD = optionalNumber(formData, "vitaminD");
    const vitaminE = optionalNumber(formData, "vitaminE");
    const vitaminK = optionalNumber(formData, "vitaminK");
    const vitaminC = optionalNumber(formData, "vitaminC");
    const thiamin = optionalNumber(formData, "thiamin");
    const riboflavin = optionalNumber(formData, "riboflavin");
    const niacin = optionalNumber(formData, "niacin");
    const vitaminB6 = optionalNumber(formData, "vitaminB6");
    const biotin = optionalNumber(formData, "biotin");
    const folicAcid = optionalNumber(formData, "folicAcid");
    const pantothenicAcid = optionalNumber(formData, "pantothenicAcid");
    const vitaminB12 = optionalNumber(formData, "vitaminB12");

    const calcium = optionalNumber(formData, "calcium");
    const chloride = optionalNumber(formData, "chloride");
    const copper = optionalNumber(formData, "copper");
    const chromium = optionalNumber(formData, "chromium");
    const iron = optionalNumber(formData, "iron");
    const fluoride = optionalNumber(formData, "fluoride");
    const phosphorus = optionalNumber(formData, "phosphorus");
    const iodine = optionalNumber(formData, "iodine");
    const magnesium = optionalNumber(formData, "magnesium");
    const manganese = optionalNumber(formData, "manganese");
    const molybdenum = optionalNumber(formData, "molybdenum");
    const potassium = optionalNumber(formData, "potassium");
    const selenium = optionalNumber(formData, "selenium");
    const zinc = optionalNumber(formData, "zinc");
    const choline = optionalNumber(formData, "choline");
    const micronutrients = optionalMicronutrientPayload(formData);

    if (!name) return { error: "Nome é obrigatório" };

    try {
        await prisma.customIngredient.create({
            data: {
                userId: user.id,
                name: `[Meu] ${name}`, // Prefix as requested
                energy, carbs, protein, fatTotal, fatSat, fatTrans, fiber, sodium, sugarTotal, sugarAdded,
                fatMono, fatPoly, omega6, omega3, cholesterol,
                vitaminA, vitaminD, vitaminE, vitaminK, vitaminC, thiamin, riboflavin, niacin, vitaminB6, biotin, folicAcid, pantothenicAcid, vitaminB12,
                calcium, chloride, copper, chromium, iron, fluoride, phosphorus, iodine, magnesium, manganese, molybdenum, potassium, selenium, zinc, choline,
                ...micronutrients,
                ingredientsText, allergensText, glutenText, containsGluten, customNutrients,
            }
        });

        revalidatePath("/dashboard/ingredients");
        return { success: true };
    } catch {
        return { error: "Erro ao criar ingrediente" };
    }
}

export async function deleteCustomIngredient(id: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) return { error: "Não autorizado" };

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return { error: "Usuário não encontrado" };
    const moduleError = await requireCustomIngredientsModule();
    if (moduleError) return { error: moduleError };

    try {
        // Ensure ownership
        const ing = await prisma.customIngredient.findUnique({ where: { id } });
        if (!ing || ing.userId !== user.id) return { error: "Não encontrado ou sem permissão" };

        await prisma.customIngredient.delete({ where: { id } });
        revalidatePath("/dashboard/ingredients");
        return { success: true };
    } catch {
        return { error: "Erro ao deletar" };
    }
}

export async function updateCustomIngredient(id: string, prevState: unknown, formData: FormData): Promise<{ error?: string; success?: boolean }> {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) return { error: "Não autorizado" };

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return { error: "Usuário não encontrado" };
    const moduleError = await requireCustomIngredientsModule();
    if (moduleError) return { error: moduleError };

    const name = formData.get("name") as string;
    const energy = optionalNumber(formData, "energy") || 0;
    const carbs = optionalNumber(formData, "carbs") || 0;
    const protein = optionalNumber(formData, "protein") || 0;
    const fatTotal = optionalNumber(formData, "fatTotal") || 0;
    const fatSat = optionalNumber(formData, "fatSat") || 0;
    const fatTrans = optionalNumber(formData, "fatTrans") || 0;
    const fiber = optionalNumber(formData, "fiber") || 0;
    const sodium = optionalNumber(formData, "sodium") || 0;
    const sugarTotal = optionalNumber(formData, "sugarTotal") || 0;
    const sugarAdded = optionalNumber(formData, "sugarAdded") || 0;
    const ingredientsText = formData.get("ingredientsText") as string || null;
    const allergensText = formData.get("allergensText") as string || null;
    const glutenText = formData.get("glutenText") as string || null;
    const containsGlutenRaw = formData.get("containsGluten") as string;
    const containsGluten = containsGlutenRaw === "true" ? true : containsGlutenRaw === "false" ? false : null;
    const customNutrientsRaw = formData.get("customNutrients") as string;
    const customNutrients = customNutrientsRaw ? JSON.parse(customNutrientsRaw) : undefined;


    // Micronutrients
    const fatMono = optionalNumber(formData, "fatMono");
    const fatPoly = optionalNumber(formData, "fatPoly");
    const omega6 = optionalNumber(formData, "omega6");
    const omega3 = optionalNumber(formData, "omega3");
    const cholesterol = optionalNumber(formData, "cholesterol");

    const vitaminA = optionalNumber(formData, "vitaminA");
    const vitaminD = optionalNumber(formData, "vitaminD");
    const vitaminE = optionalNumber(formData, "vitaminE");
    const vitaminK = optionalNumber(formData, "vitaminK");
    const vitaminC = optionalNumber(formData, "vitaminC");
    const thiamin = optionalNumber(formData, "thiamin");
    const riboflavin = optionalNumber(formData, "riboflavin");
    const niacin = optionalNumber(formData, "niacin");
    const vitaminB6 = optionalNumber(formData, "vitaminB6");
    const biotin = optionalNumber(formData, "biotin");
    const folicAcid = optionalNumber(formData, "folicAcid");
    const pantothenicAcid = optionalNumber(formData, "pantothenicAcid");
    const vitaminB12 = optionalNumber(formData, "vitaminB12");

    const calcium = optionalNumber(formData, "calcium");
    const chloride = optionalNumber(formData, "chloride");
    const copper = optionalNumber(formData, "copper");
    const chromium = optionalNumber(formData, "chromium");
    const iron = optionalNumber(formData, "iron");
    const fluoride = optionalNumber(formData, "fluoride");
    const phosphorus = optionalNumber(formData, "phosphorus");
    const iodine = optionalNumber(formData, "iodine");
    const magnesium = optionalNumber(formData, "magnesium");
    const manganese = optionalNumber(formData, "manganese");
    const molybdenum = optionalNumber(formData, "molybdenum");
    const potassium = optionalNumber(formData, "potassium");
    const selenium = optionalNumber(formData, "selenium");
    const zinc = optionalNumber(formData, "zinc");
    const choline = optionalNumber(formData, "choline");
    const micronutrients = optionalMicronutrientPayload(formData);

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
                calcium, chloride, copper, chromium, iron, fluoride, phosphorus, iodine, magnesium, manganese, molybdenum, potassium, selenium, zinc, choline,
                ...micronutrients,
                ingredientsText, allergensText, glutenText, containsGluten, customNutrients,
            }
        });

        revalidatePath("/dashboard/ingredients");
        return { success: true };
    } catch {
        return { error: "Erro ao atualizar ingrediente" };
    }
}

export async function searchIngredients(query: string) {
    const q = query.trim();
    const normalizedQuery = normalizeForSearch(q);
    const MAX_RESULTS = 30;

    const session = await getServerSession(authOptions);
    const user = session?.user?.email
        ? await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        })
        : null;

    if (!normalizedQuery) {
        const [customSuggestions, tacoSuggestions] = await Promise.all([
            user
                ? prisma.customIngredient.findMany({
                    where: { userId: user.id },
                    orderBy: { createdAt: 'desc' },
                    take: 12
                })
                : Promise.resolve([]),
            prisma.ingredient.findMany({
                orderBy: { name: 'asc' },
                take: 18
            })
        ]);

        return dedupeSearchResults([
            ...customSuggestions.map((c) => ({ ...c, origin: "CUSTOM" })),
            ...tacoSuggestions
        ]).slice(0, MAX_RESULTS);
    }

    const [customDirect, tacoDirect] = await Promise.all([
        user
            ? prisma.customIngredient.findMany({
                where: {
                    userId: user.id,
                    name: { contains: q, mode: 'insensitive' }
                },
                orderBy: { createdAt: 'desc' },
                take: 16
            })
            : Promise.resolve([]),
        prisma.ingredient.findMany({
            where: {
                name: {
                    contains: q,
                    mode: 'insensitive',
                },
            },
            orderBy: { name: 'asc' },
            take: 36
        })
    ]);

    let combined = dedupeSearchResults([
        ...customDirect.map((c) => ({ ...c, origin: "CUSTOM" })),
        ...tacoDirect
    ]);

    // Fallback com normalização para cobrir busca com/sem acento.
    if (combined.length < MAX_RESULTS) {
        const [customPool, tacoPool] = await Promise.all([
            user
                ? prisma.customIngredient.findMany({
                    where: { userId: user.id },
                    orderBy: { createdAt: 'desc' },
                    take: 200
                })
                : Promise.resolve([]),
            prisma.ingredient.findMany({
                orderBy: { name: 'asc' },
                take: 900
            })
        ]);

        const normalizedMatches = [
            ...customPool.map((c) => ({ ...c, origin: "CUSTOM" as const })),
            ...tacoPool
        ]
            .filter((item) => matchesNormalized(item.name, normalizedQuery))
            .sort((a, b) => {
                const rankA = matchRank(a.name, normalizedQuery);
                const rankB = matchRank(b.name, normalizedQuery);
                if (rankA !== rankB) return rankA - rankB;

                const aCustom = isCustomLike(a);
                const bCustom = isCustomLike(b);
                if (aCustom !== bCustom) return aCustom ? -1 : 1;

                return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
            });

        combined = dedupeSearchResults([...combined, ...normalizedMatches]);
    }

    return combined.slice(0, MAX_RESULTS);
}

function normalizeForSearch(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
}

function matchesNormalized(name: string, normalizedQuery: string) {
    const normalizedName = normalizeForSearch(name);
    if (normalizedName.includes(normalizedQuery)) return true;

    const tokens = normalizedQuery.split(" ").filter(Boolean);
    if (tokens.length <= 1) return false;
    return tokens.every((token) => normalizedName.includes(token));
}

function matchRank(name: string, normalizedQuery: string) {
    const normalizedName = normalizeForSearch(name);
    if (normalizedName.startsWith(normalizedQuery)) return 0;
    if (normalizedName.includes(normalizedQuery)) return 1;

    const tokens = normalizedQuery.split(" ").filter(Boolean);
    if (tokens.length > 1 && tokens.every((token) => normalizedName.includes(token))) return 2;
    return 3;
}

function isCustomLike(item: { origin?: string | null; name: string }) {
    return item.origin === "CUSTOM" || item.name.startsWith("[Meu]");
}

function dedupeSearchResults<T extends { id: string; name: string; origin?: string | null }>(items: T[]) {
    const seen = new Set<string>();
    const deduped: T[] = [];

    for (const item of items) {
        const source = isCustomLike(item) ? "custom" : "official";
        const normalizedName = normalizeForSearch(item.name);
        const keys = [item.id, `${source}:${normalizedName}`];
        if (keys.some((key) => seen.has(key))) continue;
        keys.forEach((key) => seen.add(key));
        deduped.push(item);
    }

    return deduped;
}
