import { Ingredient } from "@prisma/client";

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
}

export function calculateRecipe(ingredients: SelectedIngredient[], portionSize: number): {
    per100g: CalculatedNutrients;
    perPortion: CalculatedNutrients;
    totalWeight: number;
} {
    const totals: CalculatedNutrients = {
        energy: 0,
        carbs: 0,
        sugarTotal: 0,
        sugarAdded: 0,
        protein: 0,
        fatTotal: 0,
        fatSat: 0,
        fatTrans: 0, // Trans not usually in TACO but we have placeholder
        fiber: 0,
        sodium: 0,
    };

    let totalWeight = 0;

    for (const item of ingredients) {
        const qty = item.quantity;
        if (qty <= 0) continue;

        totalWeight += qty;
        const scale = qty / 100;

        totals.energy += (item.ingredient.energy || 0) * scale;
        totals.carbs += (item.ingredient.carbs || 0) * scale;
        totals.protein += (item.ingredient.protein || 0) * scale;
        totals.fatTotal += (item.ingredient.fatTotal || 0) * scale;
        totals.fatSat += (item.ingredient.fatSat || 0) * scale;
        totals.fatTrans += (item.ingredient.fatTrans || 0) * scale;
        totals.fiber += (item.ingredient.fiber || 0) * scale;
        totals.sodium += (item.ingredient.sodium || 0) * scale;

        // Sugars: 
        // If Ingredient has sugarTotal, use it. Else assume 0?
        // User requirement: "Açúcares só contam se checkbox marcada" -> implies "Added Sugar"?
        // Or "Açúcares totais" comes from ingredient?
        // TACO often lacks sugar. So we use 0 or item.ingredient.sugarTotal.

        const itemSugar = (item.ingredient.sugarTotal || 0) * scale;
        totals.sugarTotal += itemSugar;

        if (item.isAddedSugar) {
            // If marked as Added Sugar (e.g. Honey, Sugar, Syrup)
            // We assume the ENTIRE carb/sugar content is added sugar? 
            // Or 100% of quantity? 
            // Usually "Sugar (Sacarose)" is 99.8g carbs/100g.
            // If user marks "Is Added Sugar", we count its sugar as added.
            // If ingredient has no sugar field, maybe fallback to Carbs (for Table Sugar)?
            // For safety, let's use Carbs if Sugar is missing AND it's marked as added sugar?
            // Or just SugarTotal?
            // Let's use SugarTotal (if 0, it won't add anything).
            // Fallback: if isAddedSugar and sugarTotal is 0, use Carbs?
            // Better: User Custom Ingredient might need Sugar field.

            const valToAdd = item.ingredient.sugarTotal ? itemSugar : (item.ingredient.carbs || 0) * scale;
            totals.sugarAdded += valToAdd;

            // Also ensure it contributes to sugarTotal if it wasn't there
            if (!item.ingredient.sugarTotal) {
                totals.sugarTotal += valToAdd;
            }
        }
    }

    // Calculate per 100g of PRODUCT
    // factor = 100 / totalWeight
    const f100 = totalWeight > 0 ? 100 / totalWeight : 0;

    const per100g = scaleNutrients(totals, f100);

    // Calculate per Portion
    // factor = portionSize / totalWeight
    // OR per100g * (portion / 100)
    const fPortion = totalWeight > 0 ? portionSize / totalWeight : 0;
    const perPortion = scaleNutrients(totals, fPortion);

    return { per100g, perPortion, totalWeight };
}

function scaleNutrients(n: CalculatedNutrients, factor: number): CalculatedNutrients {
    return {
        energy: n.energy * factor,
        carbs: n.carbs * factor,
        sugarTotal: n.sugarTotal * factor,
        sugarAdded: n.sugarAdded * factor,
        protein: n.protein * factor,
        fatTotal: n.fatTotal * factor,
        fatSat: n.fatSat * factor,
        fatTrans: n.fatTrans * factor,
        fiber: n.fiber * factor,
        sodium: n.sodium * factor,
    };
}
