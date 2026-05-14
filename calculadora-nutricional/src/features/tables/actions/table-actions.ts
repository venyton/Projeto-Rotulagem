'use server'

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SelectedIngredient } from "@/features/tables/domain/nutrients";
import { PopGroup } from "@/features/tables/domain/constants";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

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

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return { error: "Usuário não encontrado" };

    try {
        const uiStateValue = data.uiState ? (data.uiState as Prisma.InputJsonValue) : undefined;
        const payload = {
            userId: user.id,
            title: data.title,
            portion: data.portion,
            uom: data.uom,
            householdMeasure: data.householdMeasure,
            popGroup: data.popGroup,
            packageContent: data.packageContent ?? null,
            servingsPerPackage: data.servingsPerPackage ?? null,
            suggestedFoodGroup: data.suggestedFoodGroup || null,
            suggestedProduct: data.suggestedProduct || null,
            uiState: uiStateValue,
        };

        const itemsPayload = data.ingredients.map(i => {
            const ingredient = i.ingredient as typeof i.ingredient & { sugarAdded?: number | null };
            return {
                name: i.ingredient.name,
                quantity: i.quantity,
                isAddedSugar: i.isAddedSugar,
                energy: i.ingredient.energy || 0,
                protein: i.ingredient.protein || 0,
                carbs: i.ingredient.carbs || 0,
                fatTotal: i.ingredient.fatTotal || 0,
                fatSat: i.ingredient.fatSat || 0,
                fatTrans: i.ingredient.fatTrans || 0,
                fiber: i.ingredient.fiber || 0,
                sodium: i.ingredient.sodium || 0,
                sugarTotal: i.ingredient.sugarTotal || 0,
                sugarAdded: ingredient.sugarAdded || 0,
            };
        });

        if (data.id) {
            // Check ownership
            const existing = await prisma.generatedTable.findFirst({
                where: { id: data.id, userId: user.id }
            });

            if (!existing) return { error: "Tabela não encontrada ou permissão negada" };

            // Transaction: Delete old items, update table, create new items
            await prisma.$transaction([
                prisma.tableItem.deleteMany({ where: { tableId: data.id } }),
                prisma.generatedTable.update({
                    where: { id: data.id },
                    data: payload
                }),
                ...itemsPayload.map(item =>
                    prisma.tableItem.create({
                        data: { ...item, tableId: data.id as string }
                    })
                )
            ]);
        } else {
            await prisma.generatedTable.create({
                data: {
                    ...payload,
                    items: {
                        create: itemsPayload
                    }
                }
            });
        }

        revalidatePath("/dashboard");
        revalidatePath(`/dashboard/edit/${data.id}`); // Revalidate edit page
        return { success: true };
    } catch (e) {
        console.error(e);
        return { error: "Erro ao salvar tabela" };
    }
}
