import test from "node:test";
import assert from "node:assert/strict";

import {
  applyManualMicronutrientOverrides,
  calculateRecipe,
  calculatePreparedProduct,
  normalizeManualMicronutrients,
  getEnergyCalculationIssues,
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
  assert.equal(result.per100g.energy, 78);
  assert.equal(result.perPortion.energy, 39);
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

test("calculateRecipe inclui quantidades pequenas no cálculo", () => {
  const result = calculateRecipe([
    { ingredient: ingredient({ carbs: 100 }), quantity: 0.00005, isAddedSugar: false },
    { ingredient: ingredient({ carbs: 0 }), quantity: 100, isAddedSugar: false },
  ], 100);
  assert.ok(result.per100g.carbs > 0);
  assert.ok(Math.abs(result.per100g.carbs - 0.000049999975) < 1e-12);
});

test("calculateRecipe soma quantidades decimais sem erro binário intermediário", () => {
  const result = calculateRecipe([
    { ingredient: ingredient(), quantity: 0.1, isAddedSugar: false },
    { ingredient: ingredient(), quantity: 0.2, isAddedSugar: false },
  ], 100);
  assert.equal(result.totalWeight, 0.3);
  assert.equal(result.per100g.carbs, 10);
});

test("calculateRecipe usa as quantidades decimais originais", () => {
  const items = Array.from({ length: 200 }, () => ({ ingredient: ingredient(), quantity: 1, quantityExact: "1.0000000000000001", isAddedSugar: false }));
  assert.equal(calculateRecipe(items, 100).totalWeight, 200.00000000000003);
});

test("preparo soma quantidades adicionadas em decimal", () => {
  const result = calculatePreparedProduct({
    powderIngredients: [{ ingredient: ingredient(), quantity: 100, isAddedSugar: false }],
    preparationIngredients: [
      { ingredient: ingredient(), quantity: 0.1, quantityExact: "0.1", isAddedSugar: false },
      { ingredient: ingredient(), quantity: 0.2, quantityExact: "0.2", isAddedSugar: false },
    ],
    powderPortionSize: 10, powderBatchWeight: 100, readyPortionSize: 10, finalYield: 100.3, preparationInstructions: "",
  });
  assert.equal(result.memorial.addedIngredientsWeight, 0.3);
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

test("cálculo energético interpreta µg e grafias equivalentes na mesma escala", () => {
  const ingredients = [{ ingredient: ingredient(), quantity: 100, isAddedSugar: false }];
  const energy = (unit: string) => calculateRecipe(ingredients, 100, [{ name: "Maltitol", amount: 1_000_000, unit }]).per100g.energy;
  const reference = calculateRecipe(ingredients, 100, [{ name: "Maltitol", amount: 1, unit: "g" }]).per100g.energy;
  for (const unit of ["µg", "μg", "mcg", "ug"]) assert.equal(energy(unit), reference);
});

test("energia com maltitol usa o carboidrato restante uma única vez", () => {
  const result = calculateRecipe([{ ingredient: ingredient({ carbs: 30, protein: 1, fatTotal: 2, fiber: 0, customNutrients: { Maltitol: { value: 28, unit: "g" } } }), quantity: 100, isAddedSugar: false }], 50);
  assert.ok(Math.abs(result.per100g.energy - 88.8) < 1e-10);
  assert.ok(Math.abs(result.perPortion.energy - 44.4) < 1e-10);
});

test("fatores específicos entram no cálculo energético", () => {
  for (const [name, factor] of Object.entries({ Maltitol: 2.1, Lactitol: 2, Xilitol: 2.4, Sorbitol: 2.6, Manitol: 1.6, Isomalt: 2, Eritritol: 0, Tagatose: 3, Polidextrose: 1 })) {
    const result = calculateRecipe([{ ingredient: ingredient({ carbs: 10, protein: 0, fatTotal: 0, fiber: 2, customNutrients: { [name]: { value: 3, unit: "g" } } }), quantity: 100, isAddedSugar: false }], 100);
    assert.ok(Math.abs(result.per100g.energy - ((name === "Polidextrose" ? 10 : 7) * 4 + 3 * factor)) < 1e-10, name);
  }
});

test("polióis totais incompletos impedem a determinação confiável", () => {
  const first = ingredient({ carbs: 10, protein: 0, fatTotal: 0, fiber: 0, customNutrients: { "Polióis totais": { value: 8, unit: "g" }, Maltitol: { value: 8, unit: "g" } } });
  const second = ingredient({ carbs: 10, protein: 0, fatTotal: 0, fiber: 0, customNutrients: { "Polióis totais": { value: 8, unit: "g" } } });
  const result = calculateRecipe([{ ingredient: first, quantity: 50, isAddedSugar: false }, { ingredient: second, quantity: 50, isAddedSugar: false }], 100);
  assert.ok(Math.abs(result.per100g.energy - 16.4) < 1e-10);
  assert.match(getEnergyCalculationIssues([{ ingredient: second, quantity: 50, isAddedSugar: false }])[0], /polióis/);
});

test("exige composição de fibra solúvel e permite zero informado", () => {
  const item = { ingredient: ingredient({ fiber: 1 }), quantity: 100, isAddedSugar: false };
  assert.match(getEnergyCalculationIssues([item])[0], /fibra alimentar solúvel/);
  item.ingredient = ingredient({ fiber: 1, customNutrients: { "Fibra alimentar solúvel": { value: 0, unit: "g" } } });
  assert.deepEqual(getEnergyCalculationIssues([item]), []);
  assert.match(getEnergyCalculationIssues([item], "infant-formula")[0], /categoria/);
});

test("identifica unidades e frações incompatíveis na composição energética", () => {
  const source = ingredient({ fiber: 1, carbs: 1, customNutrients: { "Fibra solúvel": { value: 2, unit: "g" }, Maltitol: { value: 3, unit: "ml" } } });
  const issues = getEnergyCalculationIssues([{ ingredient: source, quantity: 100, isAddedSugar: false }]);
  assert.ok(issues.some((issue) => issue.includes("unidade de massa")));
  assert.ok(issues.some((issue) => issue.includes("fibra solúvel excede")));
  assert.ok(issues.some((issue) => issue.includes("polióis excedem")));
});

test("constituintes iguais de ingredientes diferentes convertem unidades", () => {
  const first = ingredient({ customNutrients: { Maltitol: { value: 1, unit: "g" } } });
  const second = ingredient({ customNutrients: { Maltitol: { value: 1000, unit: "mg" } } });
  const result = calculateRecipe([{ ingredient: first, quantity: 50, isAddedSugar: false }, { ingredient: second, quantity: 50, isAddedSugar: false }], 100);
  assert.equal(result.per100g.customNutrients.Maltitol.value, 1);
  assert.ok(Math.abs(result.per100g.energy - 76.1) < 1e-10);
});

test("energia usa os nutrientes declarados em cada base", () => {
  const result = calculateRecipe([{ ingredient: ingredient({ carbs: 11.4, protein: 0, fatTotal: 0, fiber: 0, sugarTotal: 0 }), quantity: 100, isAddedSugar: false }], 100);
  assert.equal(result.per100g.energy, 44);
  assert.equal(result.perPortion.energy, 44);
});

test("somente fibra solúvel identificada contribui com fator 2, sem duplicar polidextrose", () => {
  const result = calculateRecipe([{ ingredient: ingredient({ carbs: 0, protein: 0, fatTotal: 0, fiber: 5, sugarTotal: 0, customNutrients: { "Fibra alimentar solúvel": { value: 4, unit: "g" }, Polidextrose: { value: 1, unit: "g" } } }), quantity: 100, isAddedSugar: false }], 100);
  assert.equal(result.per100g.energy, 7);
});
