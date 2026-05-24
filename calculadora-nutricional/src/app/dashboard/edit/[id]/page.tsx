import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TableGenerator } from "@/features/tables/components/TableGenerator";
import { SelectedIngredient } from "@/features/tables/domain/nutrients";
import { ModuleGateMessage } from "@/features/saas/components/ModuleGateMessage";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { contextHasModuleAccess, getCurrentSaaSContext } from "@/features/saas/services/entitlements";
import { MICRO_KEYS } from "@/features/tables/domain/micronutrients";

function readItemMicronutrients(item: Record<string, unknown>) {
    return Object.fromEntries(
        MICRO_KEYS.map((key) => {
            const value = item[key];
            return [key, typeof value === "number" && Number.isFinite(value) ? value : null];
        })
    );
}

export default async function EditTablePage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) redirect("/login");

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) redirect("/login");

    const context = await getCurrentSaaSContext();
    if (!context || !contextHasModuleAccess(context, SAAS_MODULES.TABLES)) {
        return <ModuleGateMessage moduleKey={SAAS_MODULES.TABLES} />;
    }

    const table = await prisma.generatedTable.findUnique({
        where: { id: params.id },
        include: { items: { orderBy: { id: "asc" } } }
    });

    if (!table || table.userId !== user.id) {
        redirect("/dashboard");
    }

    // Map DB items to SelectedIngredient structure
    // We need to fetch the original Ingredient data to fully populate correct references if needed,
    // but the TableItem snapshot has the nutritional data used at the time.
    // However, our system relies on Ingredient objects for the calculation logic if we add more.
    // For now, we reconstruct a "Mock" ingredient from the snapshot to allow editing.

    const ingredients: SelectedIngredient[] = table.items.map(item => ({
        quantity: item.quantity,
        isAddedSugar: item.isAddedSugar,
        ingredient: {
            id: "snapshot-" + item.id, // Pseudo-ID
            name: item.name,
            origin: "snapshot", // Add mock origin
            energy: item.energy,
            protein: item.protein,
            carbs: item.carbs,
            fatTotal: item.fatTotal,
            fatSat: item.fatSat,
            fatTrans: item.fatTrans,
            fiber: item.fiber,
            sodium: item.sodium,
            sugarTotal: item.sugarTotal,
            sugarAdded: item.sugarAdded,
            ...readItemMicronutrients(item as unknown as Record<string, unknown>),
        } as SelectedIngredient["ingredient"] & { sugarAdded?: number | null }
    }));

    const initialData = {
        id: table.id,
        title: table.title,
        portionSize: table.portion,
        householdMeasure: table.householdMeasure,
        popGroup: table.popGroup,
        packageContent: table.packageContent ?? undefined,
        servingsPerPackage: table.servingsPerPackage ?? undefined,
        suggestedFoodGroup: table.suggestedFoodGroup ?? undefined,
        suggestedProduct: table.suggestedProduct ?? undefined,
        uiState: table.uiState ?? undefined,
        ingredients
    };

    return (
        <div className="container mx-auto px-4 py-8 md:px-6">
            <div className="mb-6 border-b border-border/70 pb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Tabela</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Editar Tabela</h1>
            </div>
            <TableGenerator initialData={initialData} />
        </div>
    );
}
