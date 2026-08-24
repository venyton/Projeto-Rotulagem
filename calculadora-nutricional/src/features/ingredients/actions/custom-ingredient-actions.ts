'use server'

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import {
    contextHasModuleAccess,
    getCurrentSaaSContext,
    ModuleAccessError,
    requireModuleAccess,
} from "@/features/saas/services/entitlements";
import { MICRO_KEYS } from "@/features/tables/domain/micronutrients";
import { normalizeIngredientSearchText } from "@/features/ingredients/domain/ingredient-search";
import type { Prisma } from "@prisma/client";
import { consumeRequestRateLimit, getRequestRateLimit } from "@/lib/security/request-rate-limit";
import { isDatabaseId } from "@/lib/validation/identifiers";
import { parseOptionalNutrientNumber } from "@/features/ingredients/domain/ingredient-nutrient-input";
import {
    customIngredientSearchDtoSelect,
    ingredientDtoSelect,
    toCustomIngredientSearchDto,
    toIngredientDto,
} from "@/features/ingredients/services/ingredient-dto";

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
    return parseOptionalNutrientNumber(formData.get(key));
}

function readText(formData: FormData, key: string, maxLength: number) {
    const value = formData.get(key);
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length <= maxLength ? trimmed : null;
}

function parseCustomNutrients(raw: FormDataEntryValue | null) {
    if (raw === null || raw === "") return { value: undefined };
    if (typeof raw !== "string" || raw.length > 50_000) return { error: true };

    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { error: true };
        const entries = Object.entries(parsed);
        if (entries.length > 100) return { error: true };
        for (const [key, item] of entries) {
            if (key.length < 1 || key.length > 80 || !item || typeof item !== "object" || Array.isArray(item)) {
                return { error: true };
            }
            const value = (item as Record<string, unknown>).value;
            const unit = (item as Record<string, unknown>).unit;
            if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1_000_000_000) return { error: true };
            if (typeof unit !== "string" || unit.length > 30) return { error: true };
        }
        return { value: parsed };
    } catch {
        return { error: true };
    }
}

const CORE_NUTRIENT_KEYS = [
    "energy", "carbs", "protein", "fatTotal", "fatSat", "fatTrans", "fiber", "sodium", "sugarTotal", "sugarAdded",
] as const;
type CoreNutrientKey = typeof CORE_NUTRIENT_KEYS[number];
type MicronutrientKey = typeof MICRO_KEYS[number];
type NutrientPayload = Record<CoreNutrientKey, number> & Record<MicronutrientKey, number | null>;

function readNutrientPayload(formData: FormData) {
    const payload: Record<string, number | null> = {};
    for (const key of [...CORE_NUTRIENT_KEYS, ...MICRO_KEYS]) {
        const parsed = optionalNumber(formData, key);
        if (!parsed.ok) return null;
        payload[key] = CORE_NUTRIENT_KEYS.includes(key as typeof CORE_NUTRIENT_KEYS[number])
            ? parsed.value ?? 0
            : parsed.value;
    }
    return payload as NutrientPayload;
}

export async function createCustomIngredient(prevState: unknown, formData: FormData): Promise<{ error?: string; success?: boolean }> {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) return { error: "Não autorizado" };

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return { error: "Usuário não encontrado" };
    const moduleError = await requireCustomIngredientsModule();
    if (moduleError) return { error: moduleError };
    const context = await getCurrentSaaSContext();
    if (!context || context.user.id !== user.id) return { error: "Workspace não encontrado" };

    const name = readText(formData, "name", 160);
    const nutrientPayload = readNutrientPayload(formData);
    if (!nutrientPayload) return { error: "Valores nutricionais inválidos" };
    const ingredientsText = readText(formData, "ingredientsText", 20_000);
    const allergensText = readText(formData, "allergensText", 10_000);
    const glutenText = readText(formData, "glutenText", 10_000);
    const containsGlutenRaw = formData.get("containsGluten") as string;
    const containsGluten = containsGlutenRaw === "true" ? true : containsGlutenRaw === "false" ? false : null;
    const customNutrientsResult = parseCustomNutrients(formData.get("customNutrients"));
    if (customNutrientsResult.error) return { error: "Nutrientes personalizados inválidos" };
    const customNutrients = customNutrientsResult.value;
    if (!name) return { error: "Nome é obrigatório" };

    const requestLimit = await consumeRequestRateLimit(
        "ingredient_writes",
        user.id,
        getRequestRateLimit("ingredientWrites"),
    );
    if (!requestLimit.allowed) return { error: "Limite temporário de alterações atingido. Tente novamente mais tarde." };

    const persistedName = `[Meu] ${name}`;

    try {
        await prisma.customIngredient.create({
            data: {
                userId: user.id,
                organizationId: context.organization.id,
                name: persistedName,
                searchName: normalizeIngredientSearchText(persistedName),
                ...nutrientPayload,
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
    if (!isDatabaseId(id)) return { error: "Solicitação inválida" };
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) return { error: "Não autorizado" };

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return { error: "Usuário não encontrado" };
    const moduleError = await requireCustomIngredientsModule();
    if (moduleError) return { error: moduleError };
    const context = await getCurrentSaaSContext();
    if (!context || context.user.id !== user.id) return { error: "Workspace não encontrado" };

    const requestLimit = await consumeRequestRateLimit(
        "ingredient_writes",
        user.id,
        getRequestRateLimit("ingredientWrites"),
    );
    if (!requestLimit.allowed) return { error: "Limite temporário de alterações atingido. Tente novamente mais tarde." };

    try {
        // Ensure ownership
        const ing = await prisma.customIngredient.findUnique({ where: { id } });
        if (!ing || ing.organizationId !== context.organization.id) return { error: "Não encontrado ou sem permissão" };

        await prisma.customIngredient.delete({ where: { id } });
        revalidatePath("/dashboard/ingredients");
        return { success: true };
    } catch {
        return { error: "Erro ao deletar" };
    }
}

export async function updateCustomIngredient(id: string, prevState: unknown, formData: FormData): Promise<{ error?: string; success?: boolean }> {
    if (!isDatabaseId(id)) return { error: "Solicitação inválida" };
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) return { error: "Não autorizado" };

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return { error: "Usuário não encontrado" };
    const moduleError = await requireCustomIngredientsModule();
    if (moduleError) return { error: moduleError };
    const context = await getCurrentSaaSContext();
    if (!context || context.user.id !== user.id) return { error: "Workspace não encontrado" };

    const name = readText(formData, "name", 160);
    const nutrientPayload = readNutrientPayload(formData);
    if (!nutrientPayload) return { error: "Valores nutricionais inválidos" };
    const ingredientsText = readText(formData, "ingredientsText", 20_000);
    const allergensText = readText(formData, "allergensText", 10_000);
    const glutenText = readText(formData, "glutenText", 10_000);
    const containsGlutenRaw = formData.get("containsGluten") as string;
    const containsGluten = containsGlutenRaw === "true" ? true : containsGlutenRaw === "false" ? false : null;
    const customNutrientsResult = parseCustomNutrients(formData.get("customNutrients"));
    if (customNutrientsResult.error) return { error: "Nutrientes personalizados inválidos" };
    const customNutrients = customNutrientsResult.value;
    if (!name) return { error: "Nome é obrigatório" };

    const requestLimit = await consumeRequestRateLimit(
        "ingredient_writes",
        user.id,
        getRequestRateLimit("ingredientWrites"),
    );
    if (!requestLimit.allowed) return { error: "Limite temporário de alterações atingido. Tente novamente mais tarde." };

    try {
        const ing = await prisma.customIngredient.findUnique({ where: { id } });
        if (!ing || ing.organizationId !== context.organization.id) return { error: "Não encontrado ou sem permissão" };

        await prisma.customIngredient.update({
            where: { id },
            data: {
                name, searchName: normalizeIngredientSearchText(name),
                ...nutrientPayload,
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
    if (typeof query !== "string" || query.length > 120 || /[\u0000-\u001f\u007f]/.test(query)) return [];
    const q = query.trim();
    const normalizedQuery = normalizeForSearch(q);
    const MAX_RESULTS = 30;

    const context = await getCurrentSaaSContext();
    if (!context || !contextHasModuleAccess(context, SAAS_MODULES.TABLES)) return [];
    const requestLimit = await consumeRequestRateLimit(
        "ingredient_search",
        context.user.id,
        getRequestRateLimit("ingredientSearch"),
    );
    if (!requestLimit.allowed) return [];
    const canUseOpenFoodFacts = contextHasModuleAccess(context, SAAS_MODULES.OPEN_FOOD_FACTS);
    const organization = contextHasModuleAccess(context, SAAS_MODULES.CUSTOM_INGREDIENTS)
        ? { id: context.organization.id }
        : null;
    const officialIngredientScope: Prisma.IngredientWhereInput = canUseOpenFoodFacts
        ? {}
        : { NOT: [{ id: { startsWith: "off-" } }, { origin: "Open Food Facts" }] };

    if (!normalizedQuery) {
        const [customSuggestions, tacoSuggestions] = await Promise.all([
            organization
                ? prisma.customIngredient.findMany({
                    where: { organizationId: organization.id },
                    select: customIngredientSearchDtoSelect,
                    orderBy: { createdAt: 'desc' },
                    take: 12
                })
                : Promise.resolve([]),
            prisma.ingredient.findMany({
                where: officialIngredientScope,
                select: ingredientDtoSelect,
                orderBy: { name: 'asc' },
                take: 18
            })
        ]);

        return dedupeSearchResults([
            ...customSuggestions.map(toCustomIngredientSearchDto),
            ...tacoSuggestions.map(toIngredientDto),
        ]).slice(0, MAX_RESULTS);
    }

    const searchNameFilter = {
        AND: normalizedQuery
            .split(" ")
            .filter(Boolean)
            .map((token) => ({ searchName: { contains: token } })),
    };

    const [customDirect, tacoDirect] = await Promise.all([
        organization
            ? prisma.customIngredient.findMany({
                where: { organizationId: organization.id, ...searchNameFilter },
                select: customIngredientSearchDtoSelect,
                orderBy: { createdAt: 'desc' },
                take: 16
            })
            : Promise.resolve([]),
        prisma.ingredient.findMany({
            where: { ...officialIngredientScope, ...searchNameFilter },
            select: ingredientDtoSelect,
            orderBy: { name: 'asc' },
            take: 36
        })
    ]);

    const combined = dedupeSearchResults([
        ...customDirect.map(toCustomIngredientSearchDto),
        ...tacoDirect.map(toIngredientDto),
    ]).sort((a, b) => {
        const rankA = matchRank(a.name, normalizedQuery);
        const rankB = matchRank(b.name, normalizedQuery);
        if (rankA !== rankB) return rankA - rankB;

        const aCustom = isCustomLike(a);
        const bCustom = isCustomLike(b);
        if (aCustom !== bCustom) return aCustom ? -1 : 1;

        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
    });

    return combined.slice(0, MAX_RESULTS);
}

const normalizeForSearch = normalizeIngredientSearchText;

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
