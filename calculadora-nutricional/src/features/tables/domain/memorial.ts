import { CalculatedNutrients } from "@/features/tables/domain/nutrients";
import { MICRONUTRIENTS } from "@/features/tables/domain/micronutrients";

export const CALCULATION_VERSION = "1.0";

export type IngredientSourceInput = {
    id?: string | null;
    name?: string | null;
    source?: string | null;
    origin?: string | null;
    sourceType?: string | null;
    manufacturer?: string | null;
};

export type MemorialNutrientDefinition = {
    key: keyof CalculatedNutrients;
    label: string;
    unit: string;
};

export const MEMORIAL_CORE_NUTRIENTS: MemorialNutrientDefinition[] = [
    { key: "energy", label: "Valor energético", unit: "kcal" },
    { key: "carbs", label: "Carboidratos", unit: "g" },
    { key: "sugarTotal", label: "Açúcares totais", unit: "g" },
    { key: "sugarAdded", label: "Açúcares adicionados", unit: "g" },
    { key: "protein", label: "Proteínas", unit: "g" },
    { key: "fatTotal", label: "Gorduras totais", unit: "g" },
    { key: "fatSat", label: "Gorduras saturadas", unit: "g" },
    { key: "fatTrans", label: "Gorduras trans", unit: "g" },
    { key: "fiber", label: "Fibras alimentares", unit: "g" },
    { key: "sodium", label: "Sódio", unit: "mg" },
];

export const MEMORIAL_MICRONUTRIENTS: MemorialNutrientDefinition[] = MICRONUTRIENTS.map((item) => ({
    key: item.name,
    label: item.label,
    unit: item.unit,
}));

// These fields are present in the reference memorial and must remain visible
// even when the current formula contains no value for them.
export const MEMORIAL_REQUIRED_MICRONUTRIENT_KEYS = [
    "vitaminA",
    "thiamin",
    "riboflavin",
    "vitaminB6",
    "vitaminC",
    "iron",
    "zinc",
] as const;

const SOURCE_TYPE_LABELS: Record<string, string> = {
    AI_TECHNICAL_SHEET: "Ficha técnica importada",
    LAB_REPORT: "Laudo laboratorial",
    SUPPLIER: "Informação do fornecedor",
    OFFICIAL_TABLE: "Tabela oficial",
};

function normalizeSource(value: string | null | undefined) {
    return (value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
}

export function getIngredientSourceLabel(input: IngredientSourceInput) {
    if (input.source?.trim()) return input.source.trim();

    const origin = input.origin?.trim() || "";
    const normalizedOrigin = normalizeSource(origin);
    const sourceType = input.sourceType?.trim() || "";
    const normalizedSourceType = normalizeSource(sourceType);

    if (input.id?.startsWith("off-") || normalizedOrigin === "OPEN FOOD FACTS") {
        return "Open Food Facts";
    }

    if (SOURCE_TYPE_LABELS[sourceType]) {
        return SOURCE_TYPE_LABELS[sourceType];
    }

    if (SOURCE_TYPE_LABELS[normalizedSourceType]) {
        return SOURCE_TYPE_LABELS[normalizedSourceType];
    }

    if (normalizedSourceType && normalizedSourceType !== "MANUAL") {
        return `Fonte registrada: ${sourceType}`;
    }

    if (origin && normalizedOrigin !== "CUSTOM" && normalizedOrigin !== "SNAPSHOT") {
        return `Tabela oficial: ${origin}`;
    }

    if (normalizedOrigin === "CUSTOM" || input.name?.startsWith("[Meu]")) {
        return input.manufacturer?.trim()
            ? `Informação do fornecedor: ${input.manufacturer.trim()}`
            : "Ingrediente próprio — fonte manual não especificada";
    }

    return "Fonte não informada no cadastro";
}
