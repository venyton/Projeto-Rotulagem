import type { IngredientDto } from "../../ingredients/domain/ingredient-dto";
import { MICRO_KEYS, type MicronutrientKey } from "./micronutrients";
import BigNumber from "bignumber.js";
import { formatAnnexIvNutrientPair, roundMacro } from "./anvisa";
import type { RegulatoryCategory } from "./regulatory-declarations";

const NutritionDecimal = BigNumber.clone({ DECIMAL_PLACES: 400, ROUNDING_MODE: BigNumber.ROUND_HALF_UP });

export interface SelectedIngredient {
    ingredient: IngredientDto;
    quantity: number; // g
    quantityExact?: string; // g, decimal serializável
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
    { aliases: ["polidextrose", "polide xtrose"], factor: 1, subtractFromCarbs: false },
    { aliases: ["maltitol"], factor: 2.1, subtractFromCarbs: true },
    { aliases: ["lactitol"], factor: 2, subtractFromCarbs: true },
    { aliases: ["xilitol", "xylitol"], factor: 2.4, subtractFromCarbs: true },
    { aliases: ["sorbitol"], factor: 2.6, subtractFromCarbs: true },
    { aliases: ["manitol", "mannitol"], factor: 1.6, subtractFromCarbs: true },
    { aliases: ["isomalt", "isomalte"], factor: 2, subtractFromCarbs: true },
    { aliases: ["eritritol", "erythritol"], factor: 0, subtractFromCarbs: true },
    { aliases: ["tagatose"], factor: 3, subtractFromCarbs: true },
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

/** Pendências que impedem determinar energia sem presumir a composição. */
export function getEnergyCalculationIssues(ingredients: SelectedIngredient[], category: RegulatoryCategory = "general-food"): string[] {
    const issues = new Set<string>();
    if (category !== "general-food" && category !== "supplement") {
        issues.add("A categoria selecionada exige validação específica das regras de declaração antes da exportação.");
    }
    for (const { ingredient, quantity } of ingredients) {
        if (quantity <= 0) continue;
        const entries = Object.entries(ingredient.customNutrients || {});
        const soluble = entries.filter(([name]) => ["fibra soluvel", "fibras soluveis", "fibra alimentar soluvel", "fibras alimentares soluveis"].includes(normalizeEnergyComponentName(name)));
        if ((ingredient.fiber || 0) > 0 && soluble.length === 0) {
            issues.add(`${ingredient.name}: informe a quantidade de fibra alimentar solúvel, inclusive zero quando aplicável.`);
        }
        const massUnit = /^(g|grama|gramas|mg|miligrama|miligramas|mcg|ug|µg|μg|micrograma|microgramas)$/;
        for (const [name, data] of entries) {
            if ((getEnergyComponent(name) || soluble.some(([label]) => label === name)) && !massUnit.test(normalizeEnergyComponentName(data.unit))) {
                issues.add(`${ingredient.name}: use uma unidade de massa para ${name}.`);
            }
        }
        const solubleAmount = soluble.reduce((sum, [, data]) => sum + amountToGrams(data.value, data.unit), 0);
        if (solubleAmount > (ingredient.fiber || 0) + 1e-9) issues.add(`${ingredient.name}: a fibra solúvel excede a fibra alimentar total.`);
        let total = 0;
        let specific = 0;
        for (const [name, data] of entries) {
            const component = getEnergyComponent(name);
            if (!component) continue;
            const grams = amountToGrams(data.value, data.unit);
            if (component.aliases.some((alias) => alias === "poliois")) total += grams;
            else if (component.aliases.some((alias) => ["maltitol", "lactitol", "xilitol", "sorbitol", "manitol", "isomalt", "eritritol"].includes(alias))) specific += grams;
        }
        if (total > specific + 1e-9) issues.add(`${ingredient.name}: informe a composição dos polióis por tipo e quantidade.`);
        if (total > 0 && specific > total + 1e-9) issues.add(`${ingredient.name}: a soma dos polióis específicos excede o total informado.`);
        if (Math.max(total, specific) > (ingredient.carbs || 0) + 1e-9) issues.add(`${ingredient.name}: os polióis excedem os carboidratos informados.`);
    }
    return [...issues];
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
        normalizedUnit === "μg" ||
        normalizedUnit === "micrograma" ||
        normalizedUnit === "microgramas"
    ) {
        return amount / 1_000_000;
    }

    return amount;
}

function convertCustomAmount(value: number, from: string, to: string): number {
    const massUnits = /^(g|grama|gramas|mg|miligrama|miligramas|mcg|ug|µg|μg|micrograma|microgramas)$/;
    if (massUnits.test(normalizeEnergyComponentName(from)) && massUnits.test(normalizeEnergyComponentName(to))) {
        return amountToGrams(value, from) / amountToGrams(1, to);
    }
    return value;
}

function calculateEnergyFromComposition(nutrients: CalculatedNutrients, extraConstituents: EnergyConstituentInput[] = []) {
    let carbSubtractions = 0;
    let componentEnergy = 0;
    let totalPolyols = 0;
    let specificPolyols = 0;
    let solubleFiber = 0;
    let polydextrose = 0;

    for (const [name, data] of Object.entries(nutrients.customNutrients)) {
        const normalizedName = normalizeEnergyComponentName(name);
        if (normalizedName === "fibra soluvel" || normalizedName === "fibras soluveis" || normalizedName === "fibra alimentar soluvel" || normalizedName === "fibras alimentares soluveis") {
            solubleFiber += Number(roundMacro(amountToGrams(data.value, data.unit)).replace(",", "."));
            continue;
        }
        const component = getEnergyComponent(name);
        if (!component) continue;

        const grams = Number(roundMacro(amountToGrams(data.value, data.unit)).replace(",", "."));
        if (grams <= 0) continue;
        if (component.aliases.some((alias) => alias === "polidextrose")) polydextrose += grams;

        if (component.aliases.some((alias) => alias === "poliois")) {
            totalPolyols += grams;
            continue;
        }
        if (component.subtractFromCarbs) {
            carbSubtractions += grams;
            if (component.aliases.some((alias) => ["maltitol", "lactitol", "xilitol", "sorbitol", "manitol", "isomalt", "eritritol"].includes(alias))) specificPolyols += grams;
        }
        componentEnergy += grams * component.factor;
    }

    for (const item of extraConstituents) {
        const component = getEnergyComponent(item.name);
        if (!component) continue;

        const grams = Number(roundMacro(amountToGrams(item.amount, item.unit)).replace(",", "."));
        if (grams <= 0) continue;
        if (component.aliases.some((alias) => alias === "polidextrose")) polydextrose += grams;

        if (component.aliases.some((alias) => alias === "poliois")) {
            totalPolyols += grams;
            continue;
        }
        if (component.subtractFromCarbs) {
            carbSubtractions += grams;
            if (component.aliases.some((alias) => ["maltitol", "lactitol", "xilitol", "sorbitol", "manitol", "isomalt", "eritritol"].includes(alias))) specificPolyols += grams;
        }
        componentEnergy += grams * component.factor;
    }

    const unspecifiedPolyols = Math.max(0, totalPolyols - specificPolyols);
    carbSubtractions += unspecifiedPolyols;
    componentEnergy += Math.max(0, solubleFiber - polydextrose) * 2;
    const availableCarbs = Math.max(0, nutrients.carbs - carbSubtractions);

    return (
        availableCarbs * 4 +
        nutrients.protein * 4 +
        nutrients.fatTotal * 9 +
        componentEnergy
    );
}

function applyDeclaredEnergy(per100g: CalculatedNutrients, perPortion: CalculatedNutrients, extraConstituents: EnergyConstituentInput[] = [], portionSize = 100, category: RegulatoryCategory = "general-food") {
    const values = { per100g, perPortion };
    const declared = (nutrients: CalculatedNutrients, basis: "per100Value" | "portionValue") => ({
        ...nutrients,
        carbs: formatAnnexIvNutrientPair("carbs", values, { isSupplement: category === "supplement" })[basis],
        protein: formatAnnexIvNutrientPair("protein", values, { isSupplement: category === "supplement" })[basis],
        fatTotal: formatAnnexIvNutrientPair("fatTotal", values, { isSupplement: category === "supplement" })[basis],
    });
    perPortion.energy = calculateEnergyFromComposition(declared(perPortion, "portionValue"), extraConstituents);
    per100g.energy = calculateEnergyFromComposition(declared(per100g, "per100Value"), portionSize > 0
        ? extraConstituents.map((item) => ({ ...item, amount: amountToGrams(item.amount, item.unit) * 100 / portionSize, unit: "g" }))
        : []);
}

export function calculateRecipe(ingredients: SelectedIngredient[], portionSize: number, extraConstituents: EnergyConstituentInput[] = [], category: RegulatoryCategory = "general-food"): {
    per100g: CalculatedNutrients;
    perPortion: CalculatedNutrients;
    totalWeight: number;
} {
    const totals = new Map<string, BigNumber>();
    const customTotals = new Map<string, { value: BigNumber; unit: string }>();
    let totalWeight = new NutritionDecimal(0);

    for (const item of ingredients) {
        const qty = item.quantity;
        if (qty <= 0) continue;

        const quantity = new NutritionDecimal(item.quantityExact ?? qty);
        totalWeight = totalWeight.plus(quantity);
        const source = item.ingredient;
        const add = (key: string, value: number) => {
            const previous = totals.get(key) ?? new NutritionDecimal(0);
            totals.set(key, previous.plus(quantity.multipliedBy(value)));
        };
        for (const key of ["carbs", "protein", "fatTotal", "fatSat", "fatTrans", "fiber", "sodium", ...MICRO_KEYS] as const) {
            add(key, source[key] || 0);
        }
        const totalSugar = source.sugarTotal || 0;
        const addedSugar = item.isAddedSugar ? (source.sugarTotal || source.carbs || 0) : (source.sugarAdded || 0);
        add("sugarTotal", Math.max(totalSugar, addedSugar));
        add("sugarAdded", addedSugar);
        const custom = source.customNutrients as Record<string, { value: number; unit: string }> | null;
        if (custom && typeof custom === "object" && !Array.isArray(custom)) {
            for (const [key, data] of Object.entries(custom)) {
                const previous = customTotals.get(key) ?? { value: new NutritionDecimal(0), unit: data.unit };
                const value = convertCustomAmount(data.value || 0, data.unit, previous.unit);
                customTotals.set(key, { ...previous, value: previous.value.plus(quantity.multipliedBy(value)) });
            }
        }
    }

    const resultForPortion = (portion: number) => {
        const result = createEmptyNutrients();
        if (totalWeight.isZero()) return result;
        const numerator = new NutritionDecimal(portion);
        const denominator = totalWeight.multipliedBy(100);
        for (const [key, value] of totals) {
            if (key in result && key !== "customNutrients") {
                result[key as Exclude<keyof CalculatedNutrients, "customNutrients">] = value.multipliedBy(numerator).dividedBy(denominator).toNumber();
            }
        }
        for (const [key, data] of customTotals) result.customNutrients[key] = { value: data.value.multipliedBy(numerator).dividedBy(denominator).toNumber(), unit: data.unit };
        return result;
    };
    const per100g = resultForPortion(100);
    const perPortion = resultForPortion(portionSize);
    applyDeclaredEnergy(per100g, perPortion, extraConstituents, portionSize, category);

    return { per100g, perPortion, totalWeight: totalWeight.toNumber() };
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
    category?: RegulatoryCategory;
}): PreparedProductCalculation {
    const powderPortionSize = input.powderPortionSize > 0 ? input.powderPortionSize : 0;
    const powderRecipe = calculateRecipe(input.powderIngredients, powderPortionSize, input.extraConstituents, input.category);
    const powderBatch = scaleNutrients(powderRecipe.per100g, input.powderBatchWeight > 0 ? input.powderBatchWeight / 100 : 0);
    const addedIngredientsWeight = input.preparationIngredients.reduce(
        (sum, item) => item.quantity > 0 ? sum.plus(item.quantityExact ?? item.quantity) : sum,
        new NutritionDecimal(0),
    ).toNumber();
    const addedRecipe = calculateRecipe(input.preparationIngredients, addedIngredientsWeight);
    const preparedBatch = addNutrients(powderBatch, addedRecipe.perPortion);
    const per100g = scaleNutrients(preparedBatch, input.finalYield > 0 ? 100 / input.finalYield : 0);
    applyDeclaredEnergy(per100g, powderRecipe.perPortion, [], 100, input.category);
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

function addNutrients(a: CalculatedNutrients, b: CalculatedNutrients): CalculatedNutrients {
    const total = createEmptyNutrients();

    for (const key of Object.keys(total) as Array<keyof CalculatedNutrients>) {
        if (key === "customNutrients") continue;
        (total[key] as number) = new NutritionDecimal((a[key] as number) || 0).plus((b[key] as number) || 0).toNumber();
    }

    for (const source of [a.customNutrients, b.customNutrients]) {
        for (const [cKey, cData] of Object.entries(source)) {
            if (!total.customNutrients[cKey]) {
                total.customNutrients[cKey] = { value: 0, unit: cData.unit };
            }
            total.customNutrients[cKey].value = new NutritionDecimal(total.customNutrients[cKey].value).plus(convertCustomAmount(cData.value || 0, cData.unit, total.customNutrients[cKey].unit)).toNumber();
        }
    }

    return total;
}

function scaleNutrients(n: CalculatedNutrients, factor: number): CalculatedNutrients {
    const scaled = { ...n };
    for (const key of Object.keys(scaled) as Array<keyof CalculatedNutrients>) {
        if (key === "customNutrients") continue;
        (scaled[key] as number) = new NutritionDecimal(scaled[key] as number).multipliedBy(factor).toNumber();
    }
    
    scaled.customNutrients = {};
    for (const [cKey, cData] of Object.entries(n.customNutrients)) {
        scaled.customNutrients[cKey] = {
            value: new NutritionDecimal(cData.value).multipliedBy(factor).toNumber(),
            unit: cData.unit
        };
    }
    
    return scaled;
}
