import test from "node:test";
import assert from "node:assert/strict";

import {
  applyManualMicronutrientOverrides,
  calculateRecipe,
  normalizeManualMicronutrients,
  type SelectedIngredient,
} from "./nutrients";

function ingredient(values: Partial<SelectedIngredient["ingredient"]> = {}) {
  return {
    id: "ingredient-test",
    name: "Ingrediente de teste",
    carbs: 10,
    protein: 5,
    fatTotal: 2,
    fatSat: 1,
    fatTrans: 0,
    fiber: 1,
    sodium: 10,
    sugarTotal: 2,
    sugarAdded: 0,
    customNutrients: {},
    ...values,
  } as unknown as SelectedIngredient["ingredient"];
}

test("calculateRecipe preserves the 100 g basis and scales portions", () => {
  const result = calculateRecipe([
    { ingredient: ingredient(), quantity: 100, isAddedSugar: false },
  ], 50);

  assert.equal(result.totalWeight, 100);
  assert.equal(result.per100g.carbs, 10);
  assert.equal(result.perPortion.carbs, 5);
  assert.equal(result.per100g.energy, 76);
  assert.equal(result.perPortion.energy, 38);
});

test("calculateRecipe marks added sugar from the selected ingredient", () => {
  const result = calculateRecipe([
    { ingredient: ingredient({ sugarTotal: 12 }), quantity: 100, isAddedSugar: true },
  ], 100);

  assert.equal(result.per100g.sugarTotal, 12);
  assert.equal(result.per100g.sugarAdded, 12);
});

test("calculateRecipe ignores non-positive ingredient quantities", () => {
  const result = calculateRecipe([
    { ingredient: ingredient(), quantity: -10, isAddedSugar: false },
  ], 50);

  assert.equal(result.totalWeight, 0);
  assert.equal(result.per100g.energy, 0);
});

test("manual micronutrients replace the 100 g value and scale the portion", () => {
  const calculation = calculateRecipe([
    { ingredient: ingredient(), quantity: 100, isAddedSugar: false },
  ], 50);
  const result = applyManualMicronutrientOverrides(calculation, {
    calcium: "125,5",
    potassium: "0",
  }, 50);

  assert.equal(result.per100g.calcium, 125.5);
  assert.equal(result.perPortion.calcium, 62.75);
  assert.equal(result.per100g.potassium, 0);
  assert.equal(result.perPortion.potassium, 0);
  assert.deepEqual(normalizeManualMicronutrients({ calcium: "125,5", energy: "80", iron: "-2" }), {
    calcium: "125,5",
  });
});
