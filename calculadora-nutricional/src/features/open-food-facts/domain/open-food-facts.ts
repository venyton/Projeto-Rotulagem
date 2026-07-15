import type { Ingredient } from "@prisma/client";

type RawNutriments = Record<string, unknown>;

export type OpenFoodFactsProduct = {
    code: string;
    name: string;
    brands?: string;
    quantity?: string;
    servingSize?: string;
    imageUrl?: string;
    sourceUrl: string;
    completeness: "high" | "medium" | "low";
    missingNutrients: string[];
    ingredient: Ingredient;
};

export type OpenFoodFactsIngredientData = Omit<Ingredient, "id">;

type RawOpenFoodFactsProduct = {
    code?: unknown;
    product_name?: unknown;
    product_name_pt?: unknown;
    product_name_en?: unknown;
    generic_name?: unknown;
    brands?: unknown;
    quantity?: unknown;
    serving_size?: unknown;
    image_front_url?: unknown;
    image_url?: unknown;
    nutriments?: RawNutriments;
};

const REQUIRED_NUTRIENTS = [
    ["energy", "valor energetico"],
    ["carbs", "carboidratos"],
    ["sugarTotal", "acucares totais"],
    ["protein", "proteinas"],
    ["fatTotal", "gorduras totais"],
    ["fatSat", "gorduras saturadas"],
    ["fiber", "fibras"],
    ["sodium", "sodio"],
] as const;

function asString(value: unknown): string {
    if (Array.isArray(value)) {
        return value
            .map((item) => asString(item))
            .filter(Boolean)
            .join(", ");
    }
    return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const parsed = Number(value.replace(",", "."));
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
}

function firstNumber(nutriments: RawNutriments, keys: string[]) {
    for (const key of keys) {
        const value = asNumber(nutriments[key]);
        if (value > 0) return value;
    }
    return 0;
}

function energyKcal(nutriments: RawNutriments) {
    const kcal = firstNumber(nutriments, ["energy-kcal_100g", "energy-kcal"]);
    if (kcal > 0) return kcal;

    const kj = firstNumber(nutriments, ["energy-kj_100g", "energy-kj", "energy_100g", "energy"]);
    return kj > 0 ? kj / 4.184 : 0;
}

function sodiumMg(nutriments: RawNutriments) {
    const sodiumGrams = firstNumber(nutriments, ["sodium_100g", "sodium"]);
    if (sodiumGrams > 0) return sodiumGrams * 1000;

    const saltGrams = firstNumber(nutriments, ["salt_100g", "salt"]);
    return saltGrams > 0 ? (saltGrams / 2.5) * 1000 : 0;
}

function buildIngredient(raw: RawOpenFoodFactsProduct, code: string, name: string): Ingredient {
    const nutriments = raw.nutriments || {};
    const brands = asString(raw.brands);
    const sourceName = brands ? `${name} - ${brands}` : name;

    return {
        id: `off-${code}`,
        name: `[OFF] ${sourceName}`,
        energy: energyKcal(nutriments),
        carbs: firstNumber(nutriments, ["carbohydrates_100g", "carbohydrates"]),
        protein: firstNumber(nutriments, ["proteins_100g", "proteins"]),
        fatTotal: firstNumber(nutriments, ["fat_100g", "fat"]),
        fatSat: firstNumber(nutriments, ["saturated-fat_100g", "saturated-fat"]),
        fatTrans: firstNumber(nutriments, ["trans-fat_100g", "trans-fat"]),
        fiber: firstNumber(nutriments, ["fiber_100g", "fiber"]),
        sodium: sodiumMg(nutriments),
        sugarTotal: firstNumber(nutriments, ["sugars_100g", "sugars"]),
        sugarAdded: 0,
        origin: "Open Food Facts",
        fatMono: firstNumber(nutriments, ["monounsaturated-fat_100g", "monounsaturated-fat"]),
        fatPoly: firstNumber(nutriments, ["polyunsaturated-fat_100g", "polyunsaturated-fat"]),
        omega6: firstNumber(nutriments, ["omega-6-fat_100g", "omega-6-fat"]),
        omega3: firstNumber(nutriments, ["omega-3-fat_100g", "omega-3-fat"]),
        cholesterol: firstNumber(nutriments, ["cholesterol_100g", "cholesterol"]),
        vitaminA: firstNumber(nutriments, ["vitamin-a_100g", "vitamin-a"]),
        vitaminD: firstNumber(nutriments, ["vitamin-d_100g", "vitamin-d"]),
        vitaminE: firstNumber(nutriments, ["vitamin-e_100g", "vitamin-e"]),
        vitaminK: firstNumber(nutriments, ["vitamin-k_100g", "vitamin-k"]),
        vitaminC: firstNumber(nutriments, ["vitamin-c_100g", "vitamin-c"]),
        thiamin: firstNumber(nutriments, ["vitamin-b1_100g", "vitamin-b1"]),
        riboflavin: firstNumber(nutriments, ["vitamin-b2_100g", "vitamin-b2"]),
        niacin: firstNumber(nutriments, ["vitamin-pp_100g", "vitamin-pp", "vitamin-b3_100g", "vitamin-b3"]),
        vitaminB6: firstNumber(nutriments, ["vitamin-b6_100g", "vitamin-b6"]),
        biotin: firstNumber(nutriments, ["biotin_100g", "biotin"]),
        folicAcid: firstNumber(nutriments, ["folates_100g", "folates", "vitamin-b9_100g", "vitamin-b9"]),
        pantothenicAcid: firstNumber(nutriments, ["pantothenic-acid_100g", "pantothenic-acid"]),
        vitaminB12: firstNumber(nutriments, ["vitamin-b12_100g", "vitamin-b12"]),
        calcium: firstNumber(nutriments, ["calcium_100g", "calcium"]),
        chloride: firstNumber(nutriments, ["chloride_100g", "chloride"]),
        copper: firstNumber(nutriments, ["copper_100g", "copper"]),
        chromium: firstNumber(nutriments, ["chromium_100g", "chromium"]),
        iron: firstNumber(nutriments, ["iron_100g", "iron"]),
        fluoride: firstNumber(nutriments, ["fluoride_100g", "fluoride"]),
        phosphorus: firstNumber(nutriments, ["phosphorus_100g", "phosphorus"]),
        iodine: firstNumber(nutriments, ["iodine_100g", "iodine"]),
        magnesium: firstNumber(nutriments, ["magnesium_100g", "magnesium"]),
        manganese: firstNumber(nutriments, ["manganese_100g", "manganese"]),
        molybdenum: firstNumber(nutriments, ["molybdenum_100g", "molybdenum"]),
        potassium: firstNumber(nutriments, ["potassium_100g", "potassium"]),
        selenium: firstNumber(nutriments, ["selenium_100g", "selenium"]),
        zinc: firstNumber(nutriments, ["zinc_100g", "zinc"]),
        choline: firstNumber(nutriments, ["choline_100g", "choline"]),
        customNutrients: null,
    };
}

function completenessFor(ingredient: Ingredient) {
    const missingNutrients = REQUIRED_NUTRIENTS
        .filter(([key]) => Number(ingredient[key as keyof Ingredient] || 0) <= 0)
        .map(([, label]) => label);

    if (missingNutrients.length <= 1) return { completeness: "high" as const, missingNutrients };
    if (missingNutrients.length <= 3) return { completeness: "medium" as const, missingNutrients };
    return { completeness: "low" as const, missingNutrients };
}

export function ingredientToCacheData(ingredient: Ingredient): OpenFoodFactsIngredientData {
    const { id: _id, ...data } = ingredient;
    void _id;
    return data;
}

export function productFromCachedIngredient(ingredient: Ingredient): OpenFoodFactsProduct | null {
    if (!ingredient.id.startsWith("off-")) return null;
    const code = ingredient.id.replace(/^off-/, "");
    if (!code) return null;

    const displayName = ingredient.name
        .replace(/^\[OFF\]\s*/i, "")
        .trim();
    const completeness = completenessFor(ingredient);

    return {
        code,
        name: displayName || ingredient.name,
        sourceUrl: `https://world.openfoodfacts.org/product/${code}`,
        ...completeness,
        ingredient,
    };
}

export function normalizeOpenFoodFactsProduct(raw: RawOpenFoodFactsProduct): OpenFoodFactsProduct | null {
    const code = asString(raw.code);
    const name =
        asString(raw.product_name_pt) ||
        asString(raw.product_name) ||
        asString(raw.product_name_en) ||
        asString(raw.generic_name);

    if (!code || !name) return null;

    const ingredient = buildIngredient(raw, code, name);
    const completeness = completenessFor(ingredient);

    return {
        code,
        name,
        brands: asString(raw.brands) || undefined,
        quantity: asString(raw.quantity) || undefined,
        servingSize: asString(raw.serving_size) || undefined,
        imageUrl: asString(raw.image_front_url) || asString(raw.image_url) || undefined,
        sourceUrl: `https://world.openfoodfacts.org/product/${code}`,
        ...completeness,
        ingredient,
    };
}
