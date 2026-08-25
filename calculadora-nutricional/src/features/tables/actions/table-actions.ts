'use server'

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SelectedIngredient } from "@/features/tables/domain/nutrients";
import { POPULATION_GROUPS, PopGroup } from "@/features/tables/domain/constants";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { contextHasModuleAccess, ModuleAccessError, requireModuleAccess } from "@/features/saas/services/entitlements";
import { MICRO_KEYS } from "@/features/tables/domain/micronutrients";
import { z } from "zod";
import { getIngredientSourceLabel } from "@/features/tables/domain/memorial";
import { consumeRequestRateLimit, getRequestRateLimit } from "@/lib/security/request-rate-limit";
import { databaseIdSchema, safeResourceIdSchema } from "@/lib/validation/identifiers";
import {
    formatUnitFraction,
    getIndividualPackagePortion,
    getOfficialProductReferencePortion,
} from "@/features/tables/domain/portion-declarations";
import { calculateServingsPerPackage } from "@/features/tables/domain/regulatory-declarations";

const ingredientSelectionSchema = z.object({
    ingredient: z.object({ id: safeResourceIdSchema }),
    quantity: z.number().finite().positive().max(10_000_000),
    isAddedSugar: z.boolean(),
}).strict();

const tableInputSchema = z.object({
    id: databaseIdSchema.optional(),
    title: z.string().trim().min(1).max(160),
    portion: z.number().finite().positive().max(10_000_000),
    uom: z.enum(["g", "ml"]),
    householdMeasure: z.string().trim().min(1).max(160),
    popGroup: z.enum(Object.values(POPULATION_GROUPS) as [PopGroup, ...PopGroup[]]),
    ingredients: z.array(ingredientSelectionSchema).min(1).max(200),
    packageContent: z.number().finite().positive().max(10_000_000).optional(),
    servingsPerPackage: z.string().trim().max(80).optional(),
    suggestedFoodGroup: z.string().trim().max(160).optional(),
    suggestedProduct: z.string().trim().max(160).optional(),
    uiState: z.record(z.string(), z.unknown()).optional(),
}).strict();

function readOptionalNutrientSnapshot(ingredient: SelectedIngredient["ingredient"]) {
    const source = ingredient as unknown as Record<string, unknown>;
    return Object.fromEntries(
        MICRO_KEYS.map((key) => {
            const value = source[key];
            return [key, typeof value === "number" && Number.isFinite(value) ? value : null];
        })
    );
}

function readCustomNutrientsSnapshot(ingredient: SelectedIngredient["ingredient"]) {
    const value = (ingredient as unknown as { customNutrients?: unknown }).customNutrients;
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    return value as Prisma.InputJsonValue;
}

function toTrustedIngredientSnapshot(ingredient: SelectedIngredient["ingredient"]) {
    const source = ingredient as unknown as Record<string, unknown>;
    return {
        id: ingredient.id,
        name: ingredient.name,
        origin: typeof source.origin === "string" ? source.origin : "snapshot",
        energy: ingredient.energy || 0,
        carbs: ingredient.carbs || 0,
        protein: ingredient.protein || 0,
        fatTotal: ingredient.fatTotal || 0,
        fatSat: ingredient.fatSat || 0,
        fatTrans: ingredient.fatTrans || 0,
        fiber: ingredient.fiber || 0,
        sodium: ingredient.sodium || 0,
        sugarTotal: ingredient.sugarTotal || 0,
        sugarAdded: typeof source.sugarAdded === "number" && Number.isFinite(source.sugarAdded) ? source.sugarAdded : 0,
        customNutrients: readCustomNutrientsSnapshot(ingredient),
        ...Object.fromEntries(MICRO_KEYS.map((key) => [key, source[key] ?? null])),
    };
}

export async function saveTable(data: {
    id?: string;
    title: string;
    portion: number;
    uom: string;
    householdMeasure: string;
    popGroup: PopGroup;
    ingredients: SelectedIngredient[];
    packageContent?: number;
    servingsPerPackage?: string;
    suggestedFoodGroup?: string;
    suggestedProduct?: string;
    uiState?: Record<string, unknown>;
}) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
        return { error: "Não autorizado" };
    }

    let context: Awaited<ReturnType<typeof requireModuleAccess>>;
    try {
        context = await requireModuleAccess(SAAS_MODULES.TABLES);
    } catch (error) {
        if (error instanceof ModuleAccessError) return { error: error.message };
        throw error;
    }

    try {
        const parsed = tableInputSchema.safeParse(data);
        if (!parsed.success) return { error: "Dados da tabela inválidos." };
        const safeData = parsed.data;
        if (safeData.uiState && JSON.stringify(safeData.uiState).length > 500_000) {
            return { error: "Estado visual da tabela excede o limite permitido." };
        }
        const requestLimit = await consumeRequestRateLimit(
            "table_writes",
            context.user.id,
            getRequestRateLimit("tableWrites"),
        );
        if (!requestLimit.allowed) return { error: "Limite temporário de gravações atingido. Tente novamente mais tarde." };

        const rawPreparationIngredients = safeData.uiState?.preparationIngredients;
        const parsedPreparationIngredients = rawPreparationIngredients === undefined
            ? { success: true as const, data: [] }
            : z.array(ingredientSelectionSchema).max(200).safeParse(rawPreparationIngredients);
        if (!parsedPreparationIngredients.success) {
            return { error: "Ingredientes de preparo inválidos." };
        }
        const preparationIngredients = parsedPreparationIngredients.data;
        const ingredientIds = [...new Set([
            ...safeData.ingredients.map((item) => item.ingredient.id),
            ...preparationIngredients.map((item) => item.ingredient.id),
        ])];
        const snapshotItemIds = ingredientIds
            .filter((id) => id.startsWith("snapshot-"))
            .map((id) => id.slice("snapshot-".length));
        const persistedIngredientIds = ingredientIds.filter((id) => !id.startsWith("snapshot-"));
        const [standardIngredients, customIngredients, existingTable] = await Promise.all([
            prisma.ingredient.findMany({ where: { id: { in: persistedIngredientIds } } }),
            prisma.customIngredient.findMany({
                where: { id: { in: persistedIngredientIds }, organizationId: context.organization.id },
            }),
            safeData.id
                ? prisma.generatedTable.findFirst({
                    where: { id: safeData.id, organizationId: context.organization.id },
                    select: { id: true },
                })
                : Promise.resolve(null),
        ]);
        if (safeData.id && !existingTable) return { error: "Tabela não encontrada ou permissão negada" };

        // A tabela já foi validada no tenant acima. Consultar os itens pelo
        // próprio tableId evita que um snapshot legítimo seja descartado por
        // um filtro relacional adicional durante a gravação do editor.
        const snapshotItems = safeData.id && snapshotItemIds.length > 0
            ? await prisma.tableItem.findMany({
                where: { id: { in: snapshotItemIds }, tableId: safeData.id },
            })
            : [];

        if (
            customIngredients.length > 0 &&
            !contextHasModuleAccess(context, SAAS_MODULES.CUSTOM_INGREDIENTS)
        ) {
            return { error: "O módulo de ingredientes próprios não está liberado." };
        }
        if (
            standardIngredients.some((ingredient) => ingredient.id.startsWith("off-") || ingredient.origin === "Open Food Facts") &&
            !contextHasModuleAccess(context, SAAS_MODULES.OPEN_FOOD_FACTS)
        ) {
            return { error: "O módulo Open Food Facts não está liberado." };
        }
        const ingredientsById = new Map<string, SelectedIngredient["ingredient"]>();
        for (const ingredient of standardIngredients) ingredientsById.set(ingredient.id, ingredient);
        for (const ingredient of customIngredients) {
            ingredientsById.set(ingredient.id, ingredient as unknown as SelectedIngredient["ingredient"]);
        }
        for (const item of snapshotItems) {
            ingredientsById.set(`snapshot-${item.id}`, ({
                id: `snapshot-${item.id}`,
                name: item.name,
                source: item.source,
                origin: "snapshot",
                energy: item.energy,
                carbs: item.carbs,
                protein: item.protein,
                fatTotal: item.fatTotal,
                fatSat: item.fatSat,
                fatTrans: item.fatTrans,
                fiber: item.fiber,
                sodium: item.sodium,
                sugarTotal: item.sugarTotal,
                sugarAdded: item.sugarAdded,
                customNutrients: item.customNutrients,
                ...Object.fromEntries(MICRO_KEYS.map((key) => [key, item[key]])),
            } as unknown) as SelectedIngredient["ingredient"]);
        }
        if (ingredientsById.size !== ingredientIds.length) {
            return { error: "Um ou mais ingredientes são inválidos ou não pertencem à conta." };
        }

        const trustedPreparationIngredients = preparationIngredients.map((item) => ({
            ingredient: toTrustedIngredientSnapshot(ingredientsById.get(item.ingredient.id)!),
            quantity: item.quantity,
            isAddedSugar: item.isAddedSugar,
        }));
        const uiStateValue = safeData.uiState
            ? ({
                ...safeData.uiState,
                preparationIngredients: trustedPreparationIngredients,
            } as Prisma.InputJsonValue)
            : undefined;
        let authoritativePortion = safeData.portion;
        let authoritativeHouseholdMeasure = safeData.householdMeasure;
        const useIndividualPackagePortion = safeData.uiState?.useIndividualPackagePortion === true;
        const useUnitFractionMeasure = safeData.uiState?.useUnitFractionMeasure === true;

        if (useIndividualPackagePortion) {
            const referencePortion = getOfficialProductReferencePortion(
                safeData.suggestedFoodGroup || "",
                safeData.suggestedProduct || "",
            );
            const individualPortion = referencePortion && safeData.packageContent
                ? getIndividualPackagePortion(referencePortion, safeData.packageContent)
                : null;
            if (!individualPortion) return { error: "Referência de embalagem individual inválida." };
            authoritativePortion = individualPortion.portion;
            authoritativeHouseholdMeasure = individualPortion.measure;
        } else if (useUnitFractionMeasure) {
            const rawUnitWeight = safeData.uiState?.unitWeightForFraction;
            const unitWeight = typeof rawUnitWeight === "number"
                ? rawUnitWeight
                : typeof rawUnitWeight === "string"
                    ? Number(rawUnitWeight.replace(",", "."))
                    : 0;
            const fraction = formatUnitFraction(authoritativePortion, unitWeight);
            if (!fraction) return { error: "Peso ou volume da unidade inválido." };
            authoritativeHouseholdMeasure = fraction;
        }

        const automaticServings = calculateServingsPerPackage(authoritativePortion, safeData.packageContent || 0);
        const rawManualServings = safeData.uiState?.servingsPerPackageManual;
        const manualServings = typeof rawManualServings === "string" ? rawManualServings.trim().slice(0, 80) : "";
        const authoritativeServings = safeData.uiState?.servingsDeclarationMode === "manual" && manualServings
            ? manualServings
            : automaticServings;
        const payload = {
            title: safeData.title,
            portion: authoritativePortion,
            uom: safeData.uom,
            householdMeasure: authoritativeHouseholdMeasure,
            popGroup: safeData.popGroup,
            packageContent: safeData.packageContent ?? null,
            servingsPerPackage: authoritativeServings || null,
            suggestedFoodGroup: safeData.suggestedFoodGroup || null,
            suggestedProduct: safeData.suggestedProduct || null,
            uiState: uiStateValue,
        };

        const itemsPayload = safeData.ingredients.map(i => {
            const trustedIngredient = ingredientsById.get(i.ingredient.id)!;
            const ingredient = trustedIngredient as typeof trustedIngredient & { sugarAdded?: number | null };
            const customNutrients = readCustomNutrientsSnapshot(trustedIngredient);
            return {
                name: trustedIngredient.name,
                source: getIngredientSourceLabel({
                    ...(trustedIngredient as unknown as Record<string, unknown>),
                    name: trustedIngredient.name,
                }),
                quantity: i.quantity,
                isAddedSugar: i.isAddedSugar,
                energy: trustedIngredient.energy || 0,
                protein: trustedIngredient.protein || 0,
                carbs: trustedIngredient.carbs || 0,
                fatTotal: trustedIngredient.fatTotal || 0,
                fatSat: trustedIngredient.fatSat || 0,
                fatTrans: trustedIngredient.fatTrans || 0,
                fiber: trustedIngredient.fiber || 0,
                sodium: trustedIngredient.sodium || 0,
                sugarTotal: trustedIngredient.sugarTotal || 0,
                sugarAdded: ingredient.sugarAdded || 0,
                customNutrients,
                ...readOptionalNutrientSnapshot(trustedIngredient),
            };
        });

        let savedTableId = safeData.id;

        if (safeData.id) {
            // Transaction: Delete old items, update table, create new items
            await prisma.$transaction([
                prisma.tableItem.deleteMany({ where: { tableId: safeData.id } }),
                prisma.generatedTable.update({
                    where: { id: safeData.id },
                    data: payload
                }),
                ...itemsPayload.map(item =>
                    prisma.tableItem.create({
                        data: { ...item, tableId: safeData.id as string }
                    })
                )
            ]);
        } else {
            const created = await prisma.generatedTable.create({
                data: {
                    ...payload,
                    userId: context.user.id,
                    organizationId: context.organization.id,
                    items: {
                        create: itemsPayload
                    }
                }
            });
            savedTableId = created.id;
        }

        revalidatePath("/dashboard");
        revalidatePath("/dashboard/tables");
        if (savedTableId) {
            revalidatePath(`/dashboard/edit/${savedTableId}`);
        }
        return { success: true, id: savedTableId };
    } catch {
        return { error: "Erro ao salvar tabela" };
    }
}
