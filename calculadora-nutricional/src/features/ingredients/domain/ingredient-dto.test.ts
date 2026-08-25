import assert from "node:assert/strict";
import test from "node:test";

import { pickIngredientDto, type IngredientDto } from "./ingredient-dto";

test("DTO nutricional remove metadados de persistência e tenant", () => {
    const forgedPersistenceRecord = {
        id: "ingredient-1",
        name: "Ingrediente",
        searchName: "ingrediente",
        energy: 1,
        carbs: 2,
        protein: 3,
        fatTotal: 4,
        fatSat: 5,
        fatTrans: 6,
        fiber: 7,
        sodium: 8,
        sugarTotal: 9,
        sugarAdded: 10,
        origin: "CUSTOM",
        fatMono: 0,
        fatPoly: 0,
        omega6: 0,
        omega3: 0,
        cholesterol: 0,
        customNutrients: null,
        vitaminA: 0,
        vitaminD: 0,
        vitaminE: 0,
        vitaminK: 0,
        vitaminC: 0,
        thiamin: 0,
        riboflavin: 0,
        niacin: 0,
        vitaminB6: 0,
        biotin: 0,
        folicAcid: 0,
        pantothenicAcid: 0,
        vitaminB12: 0,
        calcium: 0,
        chloride: 0,
        copper: 0,
        chromium: 0,
        iron: 0,
        fluoride: 0,
        phosphorus: 0,
        iodine: 0,
        magnesium: 0,
        manganese: 0,
        molybdenum: 0,
        potassium: 0,
        selenium: 0,
        zinc: 0,
        choline: 0,
        userId: "must-not-leak",
        organizationId: "must-not-leak",
        sourceDocumentId: "must-not-leak",
    } as IngredientDto & Record<string, unknown>;

    const result = pickIngredientDto(forgedPersistenceRecord);

    assert.equal("userId" in result, false);
    assert.equal("organizationId" in result, false);
    assert.equal("sourceDocumentId" in result, false);
    assert.equal(result.name, "Ingrediente");
});
