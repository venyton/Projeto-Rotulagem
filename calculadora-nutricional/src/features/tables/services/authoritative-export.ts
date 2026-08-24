import "server-only";

import type { IngredientDto } from "@/features/ingredients/domain/ingredient-dto";

import { prisma } from "@/lib/prisma";
import { MICRO_KEYS } from "@/features/tables/domain/micronutrients";
import {
  applyManualMicronutrientOverrides,
  calculatePreparedProduct,
  calculateRecipe,
  type EnergyConstituentInput,
  type SelectedIngredient,
} from "@/features/tables/domain/nutrients";
import {
  exportBodySchema,
  type ExportBodyInput,
} from "@/features/tables/domain/export-schema";
import {
  calculateServingsPerPackage,
  getAvailableExportSheetTypes,
  isRegulatoryCategory,
  shouldShowDailyValue,
} from "@/features/tables/domain/regulatory-declarations";
import { isSafeResourceId } from "@/lib/validation/identifiers";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength);
}

function readPositiveNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 10_000_000 ? parsed : 0;
}

function readCustomNutrients(value: unknown) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).slice(0, 100).flatMap(([name, raw]) => {
      if (!isRecord(raw)) return [];
      const nutrientValue = typeof raw.value === "number" ? raw.value : Number(raw.value);
      const unit = readText(raw.unit, 30);
      if (!Number.isFinite(nutrientValue) || nutrientValue < 0 || nutrientValue > 1_000_000 || !unit) return [];
      return [[name.slice(0, 80), { value: nutrientValue, unit }]];
    }),
  );
}

function toSnapshotIngredient(source: UnknownRecord, fallbackId: string): IngredientDto {
  const number = (key: string) => {
    const value = source[key];
    return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
  };
  return ({
    id: readText(source.id, 100) || fallbackId,
    name: readText(source.name, 160) || "Componente sem nome",
    origin: readText(source.origin, 100) || "snapshot",
    energy: number("energy"),
    carbs: number("carbs"),
    protein: number("protein"),
    fatTotal: number("fatTotal"),
    fatSat: number("fatSat"),
    fatTrans: number("fatTrans"),
    fiber: number("fiber"),
    sodium: number("sodium"),
    sugarTotal: number("sugarTotal"),
    sugarAdded: number("sugarAdded"),
    customNutrients: readCustomNutrients(source.customNutrients),
    ...Object.fromEntries(MICRO_KEYS.map((key) => [key, number(key)])),
    searchName: "",
  } as unknown) as IngredientDto;
}

function readExtraConstituents(value: unknown): EnergyConstituentInput[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).flatMap((item) => {
    if (!isRecord(item)) return [];
    const name = readText(item.name, 120);
    const amount = typeof item.amount === "number" && Number.isFinite(item.amount)
      ? item.amount
      : readText(item.amount, 40);
    const unit = readText(item.unit, 20) || "g";
    if (!name || amount === "") return [];
    return [{ name, amount, unit }];
  });
}

type PreparationReference = { id: string; quantity: number; isAddedSugar: boolean };

function readPreparationReferences(value: unknown): PreparationReference[] | null {
  if (!Array.isArray(value)) return [];
  if (value.length > 200) return null;
  const references: PreparationReference[] = [];
  for (const raw of value) {
    if (!isRecord(raw) || !isRecord(raw.ingredient) || !isSafeResourceId(raw.ingredient.id)) return null;
    const quantity = readPositiveNumber(raw.quantity);
    if (quantity <= 0) return null;
    references.push({ id: raw.ingredient.id, quantity, isAddedSugar: raw.isAddedSugar === true });
  }
  return references;
}

async function resolvePreparationIngredients(
  references: PreparationReference[],
  organizationId: string,
  tableItems: Array<UnknownRecord>,
): Promise<SelectedIngredient[] | null> {
  if (references.length === 0) return [];
  const snapshotMap = new Map(
    tableItems.map((item) => [`snapshot-${String(item.id)}`, toSnapshotIngredient(item, `snapshot-${String(item.id)}`)]),
  );
  const persistedIds = [...new Set(references.map((item) => item.id).filter((id) => !id.startsWith("snapshot-")))];
  const [standard, custom] = await Promise.all([
    prisma.ingredient.findMany({ where: { id: { in: persistedIds } } }),
    prisma.customIngredient.findMany({ where: { id: { in: persistedIds }, organizationId } }),
  ]);
  const trusted = new Map<string, IngredientDto>();
  for (const ingredient of standard) trusted.set(ingredient.id, ingredient);
  for (const ingredient of custom) trusted.set(ingredient.id, ingredient as unknown as IngredientDto);
  for (const [id, ingredient] of snapshotMap) trusted.set(id, ingredient);

  const resolved = references.flatMap((reference) => {
    const ingredient = trusted.get(reference.id);
    return ingredient ? [{ ingredient, quantity: reference.quantity, isAddedSugar: reference.isAddedSugar }] : [];
  });
  return resolved.length === references.length ? resolved : null;
}

function selectedTableTypes(value: unknown, isSupplement: boolean, portionSize: number) {
  const available = getAvailableExportSheetTypes(isSupplement, portionSize);
  const allowed = new Set<string>(available);
  const selected = Array.isArray(value)
    ? [...new Set(value.filter((item): item is ExportBodyInput["selectedTableTypes"][number] => typeof item === "string" && allowed.has(item)))]
    : [];
  if (selected.length > 0) return selected;
  return available;
}

export async function loadAuthoritativeTableCalculation(tableId: string, organizationId: string) {
  const table = await prisma.generatedTable.findFirst({
    where: { id: tableId, organizationId },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!table) return { ok: false, error: "Tabela não encontrada." } as const;

  const uiState = isRecord(table.uiState) ? table.uiState : {};
  const ingredients: SelectedIngredient[] = table.items.map((item) => ({
    ingredient: toSnapshotIngredient(item as unknown as UnknownRecord, `snapshot-${item.id}`),
    quantity: item.quantity,
    isAddedSugar: item.isAddedSugar,
  }));
  const references = readPreparationReferences(uiState.preparationIngredients);
  if (!references) return { ok: false, error: "Dados de preparo persistidos são inválidos." } as const;
  const preparationIngredients = await resolvePreparationIngredients(
    references,
    organizationId,
    table.items as unknown as Array<UnknownRecord>,
  );
  if (!preparationIngredients) return { ok: false, error: "Ingrediente de preparo não pertence ao workspace." } as const;

  const extraConstituents = readExtraConstituents(uiState.extraConstituents);
  const powderBatchWeight = readPositiveNumber(uiState.preparationPowderBatchWeight);
  const readyPortionSize = readPositiveNumber(uiState.preparationReadyPortionSize);
  const finalYield = readPositiveNumber(uiState.preparationFinalYield);
  const powderPortionSize = readPositiveNumber(uiState.preparationPowderPortionSize) || table.portion;
  const usePreparation = uiState.enablePreparationSimulator === true && preparationIngredients.length > 0 && powderBatchWeight > 0 && readyPortionSize > 0 && finalYield > 0;
  const calculated = usePreparation
    ? calculatePreparedProduct({
        powderIngredients: ingredients,
        preparationIngredients,
        powderPortionSize,
        powderBatchWeight,
        readyPortionSize,
        finalYield,
        preparationInstructions: readText(uiState.preparationInstructions, 2_000),
        extraConstituents,
      })
    : calculateRecipe(ingredients, table.portion, extraConstituents);
  const result = applyManualMicronutrientOverrides(calculated, uiState.manualMicronutrients, table.portion);

  return {
    ok: true,
    data: {
      table,
      uiState,
      ingredients,
      preparationIngredients,
      extraConstituents,
      powderBatchWeight,
      readyPortionSize,
      finalYield,
      powderPortionSize,
      usePreparation,
      result,
    },
  } as const;
}

export async function loadAuthoritativeExportBody(tableId: string, organizationId: string) {
  const authority = await loadAuthoritativeTableCalculation(tableId, organizationId);
  if (!authority.ok) return authority;
  const { table, uiState, extraConstituents, result } = authority.data;
  const category = isRegulatoryCategory(uiState.regulatoryCategory) ? uiState.regulatoryCategory : "general-food";
  const isSupplement = category === "supplement";
  const automaticServings = calculateServingsPerPackage(table.portion, table.packageContent || 0);
  const manualServings = readText(uiState.servingsPerPackageManual, 100);
  const servingsPerPackage = uiState.servingsDeclarationMode === "manual" && manualServings
    ? manualServings
    : automaticServings;

  const parsed = exportBodySchema.safeParse({
    title: table.title,
    per100g: result.per100g,
    perPortion: result.perPortion,
    portionSize: table.portion,
    householdMeasure: table.householdMeasure,
    popGroup: table.popGroup,
    isSupplement,
    servingsPerPackage,
    selectedNutrients: Array.isArray(uiState.selectedNutrients)
      ? uiState.selectedNutrients.filter((item): item is string => typeof item === "string").slice(0, 64)
      : [],
    selectedTableTypes: selectedTableTypes(uiState.selectedTableTypes, isSupplement, table.portion),
    extraConstituents,
    showDailyValue: shouldShowDailyValue(category),
  });
  if (!parsed.success) return { ok: false, error: "Tabela persistida contém dados inválidos para exportação." } as const;
  return { ok: true, data: parsed.data } as const;
}
