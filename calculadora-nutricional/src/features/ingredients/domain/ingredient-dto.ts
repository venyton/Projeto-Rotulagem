/**
 * Public nutritional contract used by the browser and the calculation domain.
 * Persistence ownership, tenant and import-tracing fields must never be added here.
 */
export type IngredientDto = {
    id: string;
    name: string;
    searchName: string;
    energy: number;
    carbs: number;
    protein: number;
    fatTotal: number;
    fatSat: number;
    fatTrans: number;
    fiber: number;
    sodium: number;
    sugarTotal: number | null;
    sugarAdded: number | null;
    origin: string | null;
    fatMono: number | null;
    fatPoly: number | null;
    omega6: number | null;
    omega3: number | null;
    cholesterol: number | null;
    customNutrients: unknown;
    vitaminA: number | null;
    vitaminD: number | null;
    vitaminE: number | null;
    vitaminK: number | null;
    vitaminC: number | null;
    thiamin: number | null;
    riboflavin: number | null;
    niacin: number | null;
    vitaminB6: number | null;
    biotin: number | null;
    folicAcid: number | null;
    pantothenicAcid: number | null;
    vitaminB12: number | null;
    calcium: number | null;
    chloride: number | null;
    copper: number | null;
    chromium: number | null;
    iron: number | null;
    fluoride: number | null;
    phosphorus: number | null;
    iodine: number | null;
    magnesium: number | null;
    manganese: number | null;
    molybdenum: number | null;
    potassium: number | null;
    selenium: number | null;
    zinc: number | null;
    choline: number | null;
};

export type CustomIngredientListDto = IngredientDto & {
    createdAt: string;
    ingredientsText: string | null;
    containsGluten: boolean | null;
    glutenText: string | null;
    allergensText: string | null;
};

const INGREDIENT_DTO_FIELDS = [
    "id", "name", "searchName", "energy", "carbs", "protein", "fatTotal", "fatSat", "fatTrans",
    "fiber", "sodium", "sugarTotal", "sugarAdded", "origin", "fatMono", "fatPoly", "omega6", "omega3",
    "cholesterol", "customNutrients", "vitaminA", "vitaminD", "vitaminE", "vitaminK", "vitaminC",
    "thiamin", "riboflavin", "niacin", "vitaminB6", "biotin", "folicAcid", "pantothenicAcid",
    "vitaminB12", "calcium", "chloride", "copper", "chromium", "iron", "fluoride", "phosphorus",
    "iodine", "magnesium", "manganese", "molybdenum", "potassium", "selenium", "zinc", "choline",
] as const satisfies readonly (keyof IngredientDto)[];

export function pickIngredientDto(source: IngredientDto): IngredientDto {
    return Object.fromEntries(INGREDIENT_DTO_FIELDS.map((field) => [field, source[field]])) as IngredientDto;
}
