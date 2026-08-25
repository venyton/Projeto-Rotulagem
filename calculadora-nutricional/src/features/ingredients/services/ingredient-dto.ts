import "server-only";

import type { Prisma } from "@prisma/client";

import type {
    CustomIngredientListDto,
    IngredientDto,
} from "@/features/ingredients/domain/ingredient-dto";
import { pickIngredientDto } from "@/features/ingredients/domain/ingredient-dto";

const nutritionalFields = {
    id: true,
    name: true,
    searchName: true,
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
    fatMono: true,
    fatPoly: true,
    omega6: true,
    omega3: true,
    cholesterol: true,
    customNutrients: true,
    vitaminA: true,
    vitaminD: true,
    vitaminE: true,
    vitaminK: true,
    vitaminC: true,
    thiamin: true,
    riboflavin: true,
    niacin: true,
    vitaminB6: true,
    biotin: true,
    folicAcid: true,
    pantothenicAcid: true,
    vitaminB12: true,
    calcium: true,
    chloride: true,
    copper: true,
    chromium: true,
    iron: true,
    fluoride: true,
    phosphorus: true,
    iodine: true,
    magnesium: true,
    manganese: true,
    molybdenum: true,
    potassium: true,
    selenium: true,
    zinc: true,
    choline: true,
} as const;

export const ingredientDtoSelect = {
    ...nutritionalFields,
    origin: true,
} satisfies Prisma.IngredientSelect;

export const customIngredientSearchDtoSelect = {
    ...nutritionalFields,
} satisfies Prisma.CustomIngredientSelect;

export const customIngredientListDtoSelect = {
    ...customIngredientSearchDtoSelect,
    createdAt: true,
    ingredientsText: true,
    containsGluten: true,
    glutenText: true,
    allergensText: true,
} satisfies Prisma.CustomIngredientSelect;

type NutritionalProjection = Prisma.IngredientGetPayload<{ select: typeof ingredientDtoSelect }>;
type CustomSearchProjection = Prisma.CustomIngredientGetPayload<{ select: typeof customIngredientSearchDtoSelect }>;
type CustomListProjection = Prisma.CustomIngredientGetPayload<{ select: typeof customIngredientListDtoSelect }>;

export function toIngredientDto(source: NutritionalProjection): IngredientDto {
    return pickIngredientDto(source);
}

export function toCustomIngredientSearchDto(source: CustomSearchProjection): IngredientDto {
    return pickIngredientDto({ ...source, origin: "CUSTOM" });
}

export function toCustomIngredientListDto(source: CustomListProjection): CustomIngredientListDto {
    return {
        ...pickIngredientDto({ ...source, origin: "CUSTOM" }),
        createdAt: source.createdAt.toISOString(),
        ingredientsText: source.ingredientsText,
        containsGluten: source.containsGluten,
        glutenText: source.glutenText,
        allergensText: source.allergensText,
    };
}
