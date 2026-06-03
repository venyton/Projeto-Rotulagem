/**
 * Rules from IN 75/2020 ANVISA
 */

export type FOPFoodType = "solid" | "liquid";
export type AnnexIvNutrientKey =
    | "energy"
    | "carbs"
    | "sugarTotal"
    | "sugarAdded"
    | "protein"
    | "fatTotal"
    | "fatSat"
    | "fatTrans"
    | "fiber"
    | "sodium";

type AnnexIvNutrientValues = Record<AnnexIvNutrientKey, number>;

type AnnexIvContext = {
    isSupplement?: boolean;
};

const ANNEX_IV_LIMITS: Record<Exclude<AnnexIvNutrientKey, "sugarAdded">, number> = {
    energy: 4,
    carbs: 0.5,
    sugarTotal: 0.5,
    protein: 0.5,
    fatTotal: 0.5,
    fatSat: 0.1,
    fatTrans: 0.1,
    fiber: 0.5,
    sodium: 5,
};

function toSafeNumber(value: number) {
    return Number.isFinite(value) && value > 0 ? value : 0;
}

export function roundEnergy(val: number): string {
    const safeValue = toSafeNumber(val);
    if (safeValue === 0) return "0";
    if (safeValue <= 50) return Math.max(5, Math.round(safeValue / 5) * 5).toString();
    return (Math.round(safeValue / 10) * 10).toString();
}

export function roundMacro(val: number): string {
    return roundGram(val);
}

export function roundSaturatedTrans(val: number): string {
    return roundGram(val);
}

export function roundSugars(val: number): string {
    return roundGram(val);
}

export function roundSodium(val: number): string {
    const safeValue = toSafeNumber(val);
    if (safeValue === 0) return "0";
    if (safeValue <= 140) return Math.max(5, Math.round(safeValue / 5) * 5).toString();
    return (Math.round(safeValue / 10) * 10).toString();
}

export function calculateVD(val: number, vdr: number | null): string {
    if (vdr === null || vdr === 0) return "-";
    const pct = (val / vdr) * 100;
    // Rule: "Arredondar para inteiro mais próximo"
    // Usually < 1% is "0"? Or just round? 
    // Standard practice: < 1 -> 0? Or just round. Math.round(0.4) = 0.
    return Math.round(pct).toString();
}

function roundGram(val: number): string {
    const safeValue = toSafeNumber(val);
    if (safeValue === 0) return "0";
    if (safeValue >= 10) return Math.round(safeValue).toString();

    const rounded = safeValue.toFixed(1).replace(".", ",");
    return rounded.endsWith(",0") ? rounded.slice(0, -2) : rounded;
}

function isPairNonSignificant(
    per100: number,
    portion: number,
    threshold: number,
    context: AnnexIvContext
) {
    if (context.isSupplement) return portion <= threshold;
    return per100 <= threshold && portion <= threshold;
}

function getAnnexIvZeroMap(
    per100g: AnnexIvNutrientValues,
    perPortion: AnnexIvNutrientValues,
    context: AnnexIvContext
): Record<AnnexIvNutrientKey, boolean> {
    const base = (key: Exclude<AnnexIvNutrientKey, "sugarAdded">) =>
        isPairNonSignificant(per100g[key], perPortion[key], ANNEX_IV_LIMITS[key], context);
    const sugarAdded = per100g.sugarAdded <= 0 && perPortion.sugarAdded <= 0;
    const sugarTotal = base("sugarTotal") && sugarAdded;
    const fatSat = base("fatSat");
    const fatTrans = base("fatTrans");

    return {
        energy: base("energy"),
        carbs: base("carbs") && sugarTotal && sugarAdded,
        sugarTotal,
        sugarAdded,
        protein: base("protein"),
        fatTotal: base("fatTotal") && fatSat && fatTrans,
        fatSat,
        fatTrans,
        fiber: base("fiber"),
        sodium: base("sodium"),
    };
}

function formatNutrientValue(key: AnnexIvNutrientKey, value: number) {
    if (key === "energy") return roundEnergy(value);
    if (key === "sodium") return roundSodium(value);
    if (key === "fatSat" || key === "fatTrans") return roundSaturatedTrans(value);
    if (key === "sugarTotal" || key === "sugarAdded") return roundSugars(value);
    return roundMacro(value);
}

export function formatAnnexIvNutrientPair(
    key: AnnexIvNutrientKey,
    values: {
        per100g: AnnexIvNutrientValues;
        perPortion: AnnexIvNutrientValues;
    },
    context: AnnexIvContext = {}
) {
    const zeroMap = getAnnexIvZeroMap(values.per100g, values.perPortion, context);
    const per100Value = zeroMap[key] ? 0 : values.per100g[key];
    const portionValue = zeroMap[key] ? 0 : values.perPortion[key];

    return {
        per100: formatNutrientValue(key, per100Value),
        portion: formatNutrientValue(key, portionValue),
        per100Value,
        portionValue,
        isNonSignificant: zeroMap[key],
    };
}

export function inferFopFoodType(householdMeasure?: string): FOPFoodType {
    const measure = (householdMeasure || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Heuristic used only when explicit product classification is unavailable.
    // If no liquid indicator is detected, keep default as "solid" (safer by current data model).
    const liquidHints = [
        "ml",
        "mililitro",
        "mililitros",
        "litro",
        "litros",
        "copo",
        "copos",
        "xicara",
        "xicaras",
        "xic.",
        "cha",
        "suco",
        "bebida",
    ];

    return liquidHints.some((hint) => measure.includes(hint)) ? "liquid" : "solid";
}

export function checkFOP(
    perReference: { sugarAdded: number, fatSat: number, sodium: number },
    foodType: FOPFoodType = "solid"
): {
    highSugar: boolean;
    highFat: boolean;
    highSodium: boolean;
} {
    // IN 75/2020 - Anexo XV:
    // Solids/Semisolid (por 100 g): sugar 15 g, sat fat 6 g, sodium 600 mg
    // Liquids (por 100 ml): sugar 7.5 g, sat fat 3 g, sodium 300 mg
    const limits = foodType === "liquid"
        ? { sugarAdded: 7.5, fatSat: 3, sodium: 300 }
        : { sugarAdded: 15, fatSat: 6, sodium: 600 };

    return {
        highSugar: perReference.sugarAdded >= limits.sugarAdded,
        highFat: perReference.fatSat >= limits.fatSat,
        highSodium: perReference.sodium >= limits.sodium,
    };
}
