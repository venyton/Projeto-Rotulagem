import { redirect } from "next/navigation";
import { ScanSearch } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/layout/page-header";
import { LupaEditor } from "@/features/tables/components/LupaEditor";
import { ModuleGateMessage } from "@/features/saas/components/ModuleGateMessage";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { contextHasModuleAccess, getCurrentSaaSContext } from "@/features/saas/services/entitlements";
import { canManageOrganizationSettings } from "@/features/settings/services/organization-settings";
import { checkFOP, inferFopFoodType, type FOPFoodType } from "@/features/tables/domain/anvisa";
import { getActiveLupaNutrients } from "@/features/tables/domain/fop-lupa";
import {
  applyManualMicronutrientOverrides,
  calculatePreparedProduct,
  calculateRecipe,
  type SelectedIngredient,
} from "@/features/tables/domain/nutrients";
import { prisma } from "@/lib/prisma";

type UiState = Record<string, unknown>;

function readUiState(value: unknown): UiState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as UiState;
}

function numberValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function toIngredient(value: Record<string, unknown>) {
  return {
    id: stringValue(value.id) || "snapshot-lupa",
    name: stringValue(value.name),
    energy: numberValue(value.energy),
    carbs: numberValue(value.carbs),
    protein: numberValue(value.protein),
    fatTotal: numberValue(value.fatTotal),
    fatSat: numberValue(value.fatSat),
    fatTrans: numberValue(value.fatTrans),
    fiber: numberValue(value.fiber),
    sodium: numberValue(value.sodium),
    sugarTotal: numberValue(value.sugarTotal),
    sugarAdded: numberValue(value.sugarAdded),
    customNutrients: {},
  } as SelectedIngredient["ingredient"];
}

function toPreparationIngredients(value: unknown): SelectedIngredient[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const source = item as Record<string, unknown>;
    const ingredient = source.ingredient;
    if (!ingredient || typeof ingredient !== "object" || Array.isArray(ingredient)) return [];
    const quantity = numberValue(source.quantity);
    if (quantity <= 0) return [];
    return [{ ingredient: toIngredient(ingredient as Record<string, unknown>), quantity, isAddedSugar: source.isAddedSugar === true }];
  });
}

export default async function LupaPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const context = await getCurrentSaaSContext();
  if (!context) redirect("/login");
  if (!context || !contextHasModuleAccess(context, SAAS_MODULES.TABLES)) {
    return <ModuleGateMessage moduleKey={SAAS_MODULES.TABLES} />;
  }

  const table = await prisma.generatedTable.findFirst({
    where: { id, organizationId: context.organization.id },
    select: {
      id: true,
      title: true,
      portion: true,
      householdMeasure: true,
      uiState: true,
      items: {
        select: {
          id: true,
          name: true,
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
        },
      },
    },
  });
  if (!table) redirect("/dashboard/tables");

  const uiState = readUiState(table.uiState);
  const ingredients: SelectedIngredient[] = table.items.map((item) => ({
    quantity: item.quantity,
    isAddedSugar: item.isAddedSugar,
    ingredient: toIngredient(item as unknown as Record<string, unknown>),
  }));
  const enablePreparationSimulator = uiState.enablePreparationSimulator === true;
  const preparationReadyPortion = numberValue(uiState.preparationReadyPortionSize);
  const preparationPowderBatch = numberValue(uiState.preparationPowderBatchWeight);
  const preparationYield = numberValue(uiState.preparationFinalYield);
  const explicitPowderPortion = numberValue(uiState.preparationPowderPortionSize);
  const calculatedPowderPortion = preparationYield > 0 ? preparationPowderBatch * (preparationReadyPortion / preparationYield) : 0;
  const powderPortionSize = explicitPowderPortion || calculatedPowderPortion || table.portion;
  const baseCalculation = enablePreparationSimulator
    ? calculatePreparedProduct({
      powderIngredients: ingredients,
      preparationIngredients: toPreparationIngredients(uiState.preparationIngredients),
      powderPortionSize,
      powderBatchWeight: preparationPowderBatch,
      readyPortionSize: preparationReadyPortion,
      finalYield: preparationYield,
      preparationInstructions: stringValue(uiState.preparationInstructions),
    })
    : calculateRecipe(ingredients, table.portion);
  const calculation = applyManualMicronutrientOverrides(baseCalculation, uiState.manualMicronutrients, table.portion);
  const fopReferenceMode = uiState.fopReferenceMode === "prepared" ? "prepared" : "as-sold";
  const reference = fopReferenceMode === "prepared" && !enablePreparationSimulator
    ? {
      sugarAdded: numberValue(uiState.preparedSugarAdded),
      fatSat: numberValue(uiState.preparedFatSat),
      sodium: numberValue(uiState.preparedSodium),
    }
    : calculation.per100g;
  const fopFoodType: FOPFoodType = uiState.fopFoodType === "liquid" || uiState.fopFoodType === "solid"
    ? uiState.fopFoodType
    : inferFopFoodType(table.householdMeasure);
  const blockedByProfile = uiState.complianceProfile === "bottled-water" || uiState.complianceProfile === "annex-xvi";
  const activeNutrients = blockedByProfile ? [] : getActiveLupaNutrients(checkFOP(reference, fopFoodType));

  return (
    <div className="app-page flex flex-col gap-6">
      <PageHeader title="Lupa frontal" description="Configure a composição vetorial vinculada à tabela nutricional." />
      {activeNutrients.length === 0 ? (
        <Alert>
          <ScanSearch />
          <AlertTitle>Sem lupa ativa nesta tabela</AlertTitle>
          <AlertDescription>Você pode revisar a classificação e os cálculos no editor da tabela. Nenhuma configuração salvará uma lupa quando ela não for aplicável.</AlertDescription>
        </Alert>
      ) : null}
      <LupaEditor
        tableId={table.id}
        tableTitle={table.title}
        activeNutrients={activeNutrients}
        tableOverride={uiState.lupaStyle}
        tenantDefault={context.organization.lupaStyleConfig}
        canManageTenantStyle={canManageOrganizationSettings(context)}
      />
    </div>
  );
}
