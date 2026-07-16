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

const safeIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
const tableInputSchema = z.object({
    id: safeIdSchema.optional(),
    title: z.string().trim().min(1).max(160),
    portion: z.number().finite().positive().max(10_000_000),
    uom: z.enum(["g", "ml"]),
    householdMeasure: z.string().trim().min(1).max(160),
    popGroup: z.enum(Object.values(POPULATION_GROUPS) as [PopGroup, ...PopGroup[]]),
    ingredients: z.array(z.object({
        ingredient: z.object({ id: safeIdSchema }),
        quantity: z.number().finite().positive().max(10_000_000),
        isAddedSugar: z.boolean(),
    })).min(1).max(200),
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

        const ingredientIds = [...new Set(safeData.ingredients.map((item) => item.ingredient.id))];
        const snapshotItemIds = ingredientIds
            .filter((id) => id.startsWith("snapshot-"))
            .map((id) => id.slice("snapshot-".length));
        const persistedIngredientIds = ingredientIds.filter((id) => !id.startsWith("snapshot-"));
        const [standardIngredients, customIngredients, snapshotItems, existingTable] = await Promise.all([
            prisma.ingredient.findMany({ where: { id: { in: persistedIngredientIds } } }),
            prisma.customIngredient.findMany({
                where: { id: { in: persistedIngredientIds }, userId: context.user.id },
            }),
            safeData.id && snapshotItemIds.length > 0
                ? prisma.tableItem.findMany({
                    where: { id: { in: snapshotItemIds }, tableId: safeData.id },
                })
                : Promise.resolve([]),
            safeData.id
                ? prisma.generatedTable.findFirst({
                    where: { id: safeData.id, userId: context.user.id },
                    select: { id: true },
                })
                : Promise.resolve(null),
        ]);
        if (safeData.id && !existingTable) return { error: "Tabela não encontrada ou permissão negada" };
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
            ingredientsById.set(`snapshot-${item.id}`, {
                id: `snapshot-${item.id}`,
                name: item.name,
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
            } as SelectedIngredient["ingredient"]);
        }
        if (ingredientsById.size !== ingredientIds.length) {
            return { error: "Um ou mais ingredientes são inválidos ou não pertencem à conta." };
        }

        const uiStateValue = safeData.uiState ? (safeData.uiState as Prisma.InputJsonValue) : undefined;
        const payload = {
            userId: context.user.id,
            title: safeData.title,
            portion: safeData.portion,
            uom: safeData.uom,
            householdMeasure: safeData.householdMeasure,
            popGroup: safeData.popGroup,
            packageContent: safeData.packageContent ?? null,
            servingsPerPackage: safeData.servingsPerPackage ?? null,
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
