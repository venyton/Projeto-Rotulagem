import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { SelectedIngredient } from "@/features/tables/domain/nutrients";
import { ModuleGateMessage } from "@/features/saas/components/ModuleGateMessage";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { contextHasModuleAccess, getCurrentSaaSContext } from "@/features/saas/services/entitlements";
import { MICRO_KEYS } from "@/features/tables/domain/micronutrients";
import { PageHeader } from "@/components/layout/page-header";

const TableGenerator = dynamic(
    () => import("@/features/tables/components/TableGenerator").then((module) => module.TableGenerator),
    { loading: () => <div className="min-h-96 animate-pulse rounded-xl border bg-card" role="status" aria-live="polite" aria-label="Carregando editor" /> }
);

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
    const context = await getCurrentSaaSContext();
    if (!context) redirect("/login");

    if (!context || !contextHasModuleAccess(context, SAAS_MODULES.TABLES)) {
        return <ModuleGateMessage moduleKey={SAAS_MODULES.TABLES} />;
    }

    const table = await prisma.generatedTable.findFirst({
        where: { id: params.id, organizationId: context.organization.id },
        select: {
            id: true,
            title: true,
            portion: true,
            householdMeasure: true,
            popGroup: true,
            packageContent: true,
            servingsPerPackage: true,
            suggestedFoodGroup: true,
            suggestedProduct: true,
            uiState: true,
            items: {
                orderBy: { id: "asc" },
                select: {
                    id: true,
                    name: true,
                    source: true,
                    quantity: true,
                    isAddedSugar: true,
                    energy: true,
                    carbs: true,
                    protein: true,
                    fatTotal: true,
                    fatSat: true,
                    fatTrans: true,
                    fiber: true,
                    sodium: true,
                    sugarTotal: true,
                    sugarAdded: true,
                    customNutrients: true,
                    fatMono: true,
                    fatPoly: true,
                    omega6: true,
                    omega3: true,
                    cholesterol: true,
                    vitaminA: true,
                    vitaminD: true,
                    vitaminE: true,
                    vitaminK: true,
                    vitaminC: true,
                    thiamin: true,
                    riboflavin: true,
                    niacin: true,
                    vitaminB6: true,
                    biotin: true,
                    folicAcid: true,
                    pantothenicAcid: true,
                    vitaminB12: true,
                    calcium: true,
                    chloride: true,
                    copper: true,
                    chromium: true,
                    iron: true,
                    fluoride: true,
                    phosphorus: true,
                    iodine: true,
                    magnesium: true,
                    manganese: true,
                    molybdenum: true,
                    potassium: true,
                    selenium: true,
                    zinc: true,
                    choline: true,
                },
            },
        },
    });

    if (!table) {
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
        ingredient: ({
            id: "snapshot-" + item.id, // Pseudo-ID
            name: item.name,
            source: item.source,
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
            customNutrients: item.customNutrients,
            ...readItemMicronutrients(item as unknown as Record<string, unknown>),
        } as unknown) as SelectedIngredient["ingredient"] & { sugarAdded?: number | null }
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
        <div className="app-page flex flex-col gap-6">
            <PageHeader title="Editar tabela" description="Revise os dados, atualize os cálculos e gere uma nova versão do rótulo." />
            <TableGenerator
                initialData={initialData}
                canUseOpenFoodFacts={contextHasModuleAccess(context, SAAS_MODULES.OPEN_FOOD_FACTS)}
                canExport={contextHasModuleAccess(context, SAAS_MODULES.EXPORTS)}
                tenantLupaStyle={context.organization.lupaStyleConfig}
            />
        </div>
    );
}
