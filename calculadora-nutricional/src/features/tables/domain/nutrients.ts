import type { IngredientDto } from "../../ingredients/domain/ingredient-dto";
import { MICRO_KEYS, type MicronutrientKey } from "./micronutrients";

type IngredientWithAddedSugar = IngredientDto & {
    sugarAdded?: number | null;
};

export interface SelectedIngredient {
    ingredient: IngredientDto;
    quantity: number; // g
    isAddedSugar: boolean;
}

export type EnergyConstituentInput = {
    name: string;
    amount: string | number;
    unit?: string;
};

export interface CalculatedNutrients {
    energy: number;
    carbs: number;
    sugarTotal: number;
    sugarAdded: number;
    protein: number;
    fatTotal: number;
    fatSat: number;
    fatTrans: number;
    fiber: number;
    sodium: number;

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
    customNutrients: Record<string, { value: number; unit: string }>;
}

export type ManualMicronutrientValues = Partial<Record<MicronutrientKey, string>>;

export type TransformationMemorial = {
    preparationInstructions: string;
    powderBatchWeight: number;
    addedIngredientsWeight: number;
    totalBeforePreparation: number;
    finalYield: number;
    preparationLoss: number;
    preparationLossPercent: number;
    readyPortionSize: number;
    powderPortionSize: number;
    powderPortionRatio: number;
    per100PreparedRatio: number;
    addedIngredients: Array<{
        name: string;
        quantity: number;
    }>;
};

export type PreparedProductCalculation = {
    per100g: CalculatedNutrients;
    perPortion: CalculatedNutrients;
    totalWeight: number;
    memorial: TransformationMemorial;
};

const ADDED_SUGAR_NAME_PATTERNS = [
    /\bacucar(?:es)?\b/,
    /\bsacarose\b/,
    /\bglicose\b/,
    /\bfrutose\b/,
    /\blactose\b/,
    /\bdextrose\b/,
    /\bacucar invertido\b/,
    /\bmel\b/,
    /\bmelaco\b/,
    /\bmelado\b/,
    /\brapadura\b/,
    /\bcaldo de cana\b/,
    /\bextrato de malte\b/,
    /\bxarope(?:s)?\b/,
    /\bmaltodextrina(?:s)?\b/,
    /\bcarboidrato(?:s)? hidrolisado(?:s)?\b/,
];

const ENERGY_COMPONENT_FACTORS = [
    { aliases: ["polidextrose", "polide xtrose"], factor: 1, subtractFromCarbs: true },
    { aliases: ["maltitol"], factor: 2.1, subtractFromCarbs: true },
    { aliases: ["lactitol"], factor: 2, subtractFromCarbs: true },
    { aliases: ["xilitol", "xylitol"], factor: 2.4, subtractFromCarbs: true },
    { aliases: ["sorbitol"], factor: 2.6, subtractFromCarbs: true },
    { aliases: ["manitol", "mannitol"], factor: 1.6, subtractFromCarbs: true },
    { aliases: ["isomalt", "isomalte"], factor: 2, subtractFromCarbs: true },
    { aliases: ["eritritol", "erythritol"], factor: 0, subtractFromCarbs: true },
    { aliases: ["tagatose"], factor: 1.5, subtractFromCarbs: true },
    { aliases: ["poliois", "poliol", "polyols", "polyol"], factor: 2.4, subtractFromCarbs: true },
    { aliases: ["alcool", "etanol", "alcohol"], factor: 7, subtractFromCarbs: false },
    { aliases: ["acidos organicos", "acido organico", "organic acids", "organic acid"], factor: 3, subtractFromCarbs: false },
] as const;

function normalizeIngredientName(name: string): string {
    return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

export function isLikelyAddedSugarIngredient(name: string): boolean {
    const normalizedName = normalizeIngredientName(name);
    return ADDED_SUGAR_NAME_PATTERNS.some((pattern) => pattern.test(normalizedName));
}

function parseDecimal(value: string | number | null | undefined): number {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value !== "string") return 0;

    const parsed = Number(value.trim().replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
}

export function parseManualMicronutrientValue(value: unknown): number | null {
    const raw = typeof value === "number"
        ? String(value)
        : typeof value === "string"
            ? value.trim()
            : "";
    if (!raw || raw.length > 32) return null;

    const parsed = Number(raw.replace(",", "."));
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1_000_000 ? parsed : null;
}

export function normalizeManualMicronutrients(value: unknown): ManualMicronutrientValues {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};

    const values = value as Record<string, unknown>;
    const normalized: ManualMicronutrientValues = {};
    for (const key of MICRO_KEYS) {
        const parsed = parseManualMicronutrientValue(values[key]);
        if (parsed === null) continue;
        normalized[key] = typeof values[key] === "string" ? values[key].trim() : String(parsed);
    }
    return normalized;
}

export function applyManualMicronutrientOverrides<T extends {
    per100g: CalculatedNutrients;
    perPortion: CalculatedNutrients;
}>(calculation: T, values: unknown, portionSize: number): T {
    const manualValues = normalizeManualMicronutrients(values);
    if (Object.keys(manualValues).length === 0) return calculation;

    const per100g = { ...calculation.per100g };
    const perPortion = { ...calculation.perPortion };
    const portionFactor = Number.isFinite(portionSize) && portionSize > 0 ? portionSize / 100 : 0;

    for (const key of MICRO_KEYS) {
        const value = parseManualMicronutrientValue(manualValues[key]);
        if (value === null) continue;
        per100g[key] = value;
        perPortion[key] = value * portionFactor;
    }

    return { ...calculation, per100g, perPortion };
}

function normalizeEnergyComponentName(value: string) {
    return normalizeIngredientName(value).replace(/\s+/g, " ").trim();
}

function getEnergyComponent(name: string) {
    const normalized = normalizeEnergyComponentName(name);
    return ENERGY_COMPONENT_FACTORS.find((component) =>
        component.aliases.some((alias) => normalized.includes(alias))
    );
}

function amountToGrams(value: string | number, unit?: string) {
    const amount = parseDecimal(value);
    const normalizedUnit = normalizeEnergyComponentName(unit || "g");

    if (normalizedUnit === "mg" || normalizedUnit === "miligrama" || normalizedUnit === "miligramas") {
        return amount / 1000;
    }

    if (
        normalizedUnit === "mcg" ||
        normalizedUnit === "ug" ||
        normalizedUnit === "µg" ||
        normalizedUnit === "micrograma" ||
        normalizedUnit === "microgramas"
    ) {
        return amount / 1_000_000;
    }

    return amount;
}

function calculateEnergyFromComposition(nutrients: CalculatedNutrients, extraConstituents: EnergyConstituentInput[] = []) {
    let carbSubtractions = 0;
    let componentEnergy = 0;

    for (const [name, data] of Object.entries(nutrients.customNutrients)) {
        const component = getEnergyComponent(name);
        if (!component) continue;

        const grams = amountToGrams(data.value, data.unit);
        if (grams <= 0) continue;

        if (component.subtractFromCarbs) {
            carbSubtractions += grams;
        }
        componentEnergy += grams * component.factor;
    }

    for (const item of extraConstituents) {
        const component = getEnergyComponent(item.name);
        if (!component) continue;

        const grams = amountToGrams(item.amount, item.unit);
        if (grams <= 0) continue;

        if (component.subtractFromCarbs) {
            carbSubtractions += grams;
        }
        componentEnergy += grams * component.factor;
    }

    const availableCarbs = Math.max(0, nutrients.carbs - nutrients.fiber - carbSubtractions);

    return (
        availableCarbs * 4 +
        nutrients.protein * 4 +
        nutrients.fatTotal * 9 +
        nutrients.fiber * 2 +
        componentEnergy
    );
}

export function calculateRecipe(ingredients: SelectedIngredient[], portionSize: number, extraConstituents: EnergyConstituentInput[] = []): {
    per100g: CalculatedNutrients;
    perPortion: CalculatedNutrients;
    totalWeight: number;
} {
    const totals = createEmptyNutrients();

    let totalWeight = 0;

    for (const item of ingredients) {
        const qty = item.quantity;
        if (qty <= 0) continue;

        totalWeight += qty;
        addIngredientNutrients(totals, item, qty / 100);
    }

    const f100 = totalWeight > 0 ? 100 / totalWeight : 0;
    const per100g = scaleNutrients(totals, f100);

    const fPortion = totalWeight > 0 ? portionSize / totalWeight : 0;
    const perPortion = scaleNutrients(totals, fPortion);
    perPortion.energy = calculateEnergyFromComposition(perPortion, extraConstituents);
    per100g.energy = calculateEnergyFromComposition(
        per100g,
        portionSize > 0
            ? extraConstituents.map((item) => ({
                ...item,
                amount: amountToGrams(item.amount, item.unit) * (100 / portionSize),
                unit: "g",
            }))
            : []
    );

    return { per100g, perPortion, totalWeight };
}

export function calculatePreparedProduct(input: {
    powderIngredients: SelectedIngredient[];
    preparationIngredients: SelectedIngredient[];
    powderPortionSize: number;
    powderBatchWeight: number;
    readyPortionSize: number;
    finalYield: number;
    preparationInstructions: string;
    extraConstituents?: EnergyConstituentInput[];
}): PreparedProductCalculation {
    const powderPortionSize = input.powderPortionSize > 0 ? input.powderPortionSize : 0;
    const powderRecipe = calculateRecipe(input.powderIngredients, powderPortionSize, input.extraConstituents);
    const powderBatch = scaleNutrients(powderRecipe.per100g, input.powderBatchWeight > 0 ? input.powderBatchWeight / 100 : 0);
    const addedIngredientsWeight = input.preparationIngredients.reduce((sum, item) => sum + Math.max(0, item.quantity || 0), 0);
    const addedRecipe = calculateRecipe(input.preparationIngredients, addedIngredientsWeight);
    const preparedBatch = addNutrients(powderBatch, addedRecipe.perPortion);
    const per100g = scaleNutrients(preparedBatch, input.finalYield > 0 ? 100 / input.finalYield : 0);
    const totalBeforePreparation = Math.max(0, input.powderBatchWeight) + addedIngredientsWeight;
    const preparationLoss = Math.max(0, totalBeforePreparation - Math.max(0, input.finalYield));
    const powderPortionRatio = input.readyPortionSize > 0 ? powderPortionSize / input.readyPortionSize : 0;

    return {
        per100g,
        perPortion: powderRecipe.perPortion,
        totalWeight: input.finalYield,
        memorial: {
            preparationInstructions: input.preparationInstructions,
            powderBatchWeight: input.powderBatchWeight,
            addedIngredientsWeight,
            totalBeforePreparation,
            finalYield: input.finalYield,
            preparationLoss,
            preparationLossPercent: totalBeforePreparation > 0 ? (preparationLoss / totalBeforePreparation) * 100 : 0,
            readyPortionSize: input.readyPortionSize,
            powderPortionSize,
            powderPortionRatio,
            per100PreparedRatio: input.finalYield > 0 ? 100 / input.finalYield : 0,
            addedIngredients: input.preparationIngredients
                .filter((item) => item.quantity > 0)
                .map((item) => ({
                    name: item.ingredient.name,
                    quantity: item.quantity,
                })),
        },
    };
}

function createEmptyNutrients(): CalculatedNutrients {
    return {
        energy: 0, carbs: 0, sugarTotal: 0, sugarAdded: 0, protein: 0,
        fatTotal: 0, fatSat: 0, fatTrans: 0, fiber: 0, sodium: 0,
        fatMono: 0, fatPoly: 0, omega6: 0, omega3: 0, cholesterol: 0,
        vitaminA: 0, vitaminD: 0, vitaminE: 0, vitaminK: 0, vitaminC: 0,
        thiamin: 0, riboflavin: 0, niacin: 0, vitaminB6: 0, biotin: 0, folicAcid: 0, pantothenicAcid: 0, vitaminB12: 0,
        calcium: 0, chloride: 0, copper: 0, chromium: 0, iron: 0, fluoride: 0, phosphorus: 0, iodine: 0, magnesium: 0,
        manganese: 0, molybdenum: 0, potassium: 0, selenium: 0, zinc: 0, choline: 0,
        customNutrients: {}
    };
}

function addIngredientNutrients(totals: CalculatedNutrients, item: SelectedIngredient, scale: number) {
    totals.carbs += (item.ingredient.carbs || 0) * scale;
    totals.protein += (item.ingredient.protein || 0) * scale;
    totals.fatTotal += (item.ingredient.fatTotal || 0) * scale;
    totals.fatSat += (item.ingredient.fatSat || 0) * scale;
    totals.fatTrans += (item.ingredient.fatTrans || 0) * scale;
    totals.fiber += (item.ingredient.fiber || 0) * scale;
    totals.sodium += (item.ingredient.sodium || 0) * scale;

    for (const key of MICRO_KEYS) {
        const val = item.ingredient[key] || 0;
        totals[key] += val * scale;
    }

    const ingredient = item.ingredient as IngredientWithAddedSugar;
    const totalSugar = (ingredient.sugarTotal || 0) * scale;
    const declaredAddedSugar = (ingredient.sugarAdded || 0) * scale;
    const addedSugar = item.isAddedSugar
        ? (ingredient.sugarTotal ? totalSugar : (ingredient.carbs || 0) * scale)
        : declaredAddedSugar;

    totals.sugarTotal += Math.max(totalSugar, addedSugar);
    totals.sugarAdded += addedSugar;

    const customObj = item.ingredient.customNutrients as Record<string, { value: number; unit: string }> | null;
    if (customObj && typeof customObj === "object" && !Array.isArray(customObj)) {
        for (const [cKey, cData] of Object.entries(customObj)) {
            if (!totals.customNutrients[cKey]) {
                totals.customNutrients[cKey] = { value: 0, unit: cData.unit };
            }
            totals.customNutrients[cKey].value += (cData.value || 0) * scale;
        }
    }
}

function addNutrients(a: CalculatedNutrients, b: CalculatedNutrients): CalculatedNutrients {
    const total = createEmptyNutrients();

    for (const key of Object.keys(total) as Array<keyof CalculatedNutrients>) {
        if (key === "customNutrients") continue;
        (total[key] as number) = ((a[key] as number) || 0) + ((b[key] as number) || 0);
    }

    for (const source of [a.customNutrients, b.customNutrients]) {
        for (const [cKey, cData] of Object.entries(source)) {
            if (!total.customNutrients[cKey]) {
                total.customNutrients[cKey] = { value: 0, unit: cData.unit };
            }
            total.customNutrients[cKey].value += cData.value || 0;
        }
    }

    return total;
}

function scaleNutrients(n: CalculatedNutrients, factor: number): CalculatedNutrients {
    const scaled = { ...n };
    for (const key of Object.keys(scaled) as Array<keyof CalculatedNutrients>) {
        if (key === "customNutrients") continue;
        (scaled[key] as number) *= factor;
    }
    
    scaled.customNutrients = {};
    for (const [cKey, cData] of Object.entries(n.customNutrients)) {
        scaled.customNutrients[cKey] = {
            value: cData.value * factor,
            unit: cData.unit
        };
    }
    
    return scaled;
}
