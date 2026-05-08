import { Ingredient } from "@prisma/client";

type IngredientWithAddedSugar = Ingredient & {
    sugarAdded?: number | null;
};

export interface SelectedIngredient {
    ingredient: Ingredient;
    quantity: number; // g
    isAddedSugar: boolean;
}

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
}

const MICRO_KEYS = [
    'fatMono', 'fatPoly', 'omega6', 'omega3', 'cholesterol',
    'vitaminA', 'vitaminD', 'vitaminE', 'vitaminK', 'vitaminC',
    'thiamin', 'riboflavin', 'niacin', 'vitaminB6', 'biotin', 'folicAcid', 'pantothenicAcid', 'vitaminB12',
    'calcium', 'chloride', 'copper', 'chromium', 'iron', 'fluoride', 'phosphorus', 'iodine', 'magnesium', 'manganese', 'molybdenum', 'potassium', 'selenium', 'zinc', 'choline'
] as const;

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

export function calculateRecipe(ingredients: SelectedIngredient[], portionSize: number): {
    per100g: CalculatedNutrients;
    perPortion: CalculatedNutrients;
    totalWeight: number;
} {
    const totals: CalculatedNutrients = {
        energy: 0, carbs: 0, sugarTotal: 0, sugarAdded: 0, protein: 0,
        fatTotal: 0, fatSat: 0, fatTrans: 0, fiber: 0, sodium: 0,
        fatMono: 0, fatPoly: 0, omega6: 0, omega3: 0, cholesterol: 0,
        vitaminA: 0, vitaminD: 0, vitaminE: 0, vitaminK: 0, vitaminC: 0,
        thiamin: 0, riboflavin: 0, niacin: 0, vitaminB6: 0, biotin: 0, folicAcid: 0, pantothenicAcid: 0, vitaminB12: 0,
        calcium: 0, chloride: 0, copper: 0, chromium: 0, iron: 0, fluoride: 0, phosphorus: 0, iodine: 0, magnesium: 0,
        manganese: 0, molybdenum: 0, potassium: 0, selenium: 0, zinc: 0, choline: 0
    };

    let totalWeight = 0;

    for (const item of ingredients) {
        const qty = item.quantity;
        if (qty <= 0) continue;

        totalWeight += qty;
        const scale = qty / 100;

        // Macros
        totals.energy += (item.ingredient.energy || 0) * scale;
        totals.carbs += (item.ingredient.carbs || 0) * scale;
        totals.protein += (item.ingredient.protein || 0) * scale;
        totals.fatTotal += (item.ingredient.fatTotal || 0) * scale;
        totals.fatSat += (item.ingredient.fatSat || 0) * scale;
        totals.fatTrans += (item.ingredient.fatTrans || 0) * scale;
        totals.fiber += (item.ingredient.fiber || 0) * scale;
        totals.sodium += (item.ingredient.sodium || 0) * scale;

        // Micros
        for (const key of MICRO_KEYS) {
            const val = item.ingredient[key] || 0;
            totals[key] += val * scale;
        }

        // Sugars: total sugars always count. Added sugars count only when declared or marked.
        const ingredient = item.ingredient as IngredientWithAddedSugar;
        const totalSugar = (ingredient.sugarTotal || 0) * scale;
        const declaredAddedSugar = (ingredient.sugarAdded || 0) * scale;
        const addedSugar = item.isAddedSugar
            ? (ingredient.sugarTotal ? totalSugar : (ingredient.carbs || 0) * scale)
            : declaredAddedSugar;

        totals.sugarTotal += Math.max(totalSugar, addedSugar);
        totals.sugarAdded += addedSugar;
    }

    const f100 = totalWeight > 0 ? 100 / totalWeight : 0;
    const per100g = scaleNutrients(totals, f100);

    const fPortion = totalWeight > 0 ? portionSize / totalWeight : 0;
    const perPortion = scaleNutrients(totals, fPortion);

    return { per100g, perPortion, totalWeight };
}

function scaleNutrients(n: CalculatedNutrients, factor: number): CalculatedNutrients {
    const scaled = { ...n };
    for (const key of Object.keys(scaled) as Array<keyof CalculatedNutrients>) {
        scaled[key] *= factor;
    }
    return scaled;
}
