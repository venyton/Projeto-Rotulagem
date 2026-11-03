import { test } from "node:test";
import { strict as assert } from "node:assert";
import { includeHistoricalConstituents, reconcileHistoricalConstituents, selectedConstituentRows } from "./extra-constituents";
import { calculateRecipe, type SelectedIngredient } from "./nutrients";

test("seleciona valores calculados, reconhece nomes antigos e soma unidades compatíveis", () => {
  const result = selectedConstituentRows(
    [{ name: "Polióis" }, { name: "Polióis totais" }, { name: "Isomalt" }, { name: "Cafeína" }],
    { customNutrients: { "Polióis totais": { value: 2, unit: "g" }, "Polióis": { value: 500, unit: "mg" }, Isomalte: { value: 1, unit: "g" } } },
    { customNutrients: { "Polióis totais": { value: 1, unit: "g" }, "Polióis": { value: 250, unit: "mg" }, Isomalte: { value: 0.5, unit: "g" } } },
  );
  assert.deepEqual(result.map(({ name, per100, portion }) => ({ name, per100, portion })), [
    { name: "Polióis totais", per100: 2.5, portion: 1.25 },
    { name: "Isomalte", per100: 1, portion: 0.5 },
    { name: "Cafeína", per100: undefined, portion: undefined },
  ]);
});

test("preserva e exibe valor antigo por porção quando não há outra fonte", () => {
  const ingredients = [{ ingredient: { carbs: 10, protein: 0, fatTotal: 0, fiber: 0, customNutrients: {} }, quantity: 100, isAddedSugar: false }] as SelectedIngredient[];
  const historical = reconcileHistoricalConstituents([{ name: "Maltitol", amount: "1,5", unit: "g" }], [{}], false);
  assert.deepEqual(historical.issues, []);
  const result = includeHistoricalConstituents(calculateRecipe(ingredients, 50, historical.accepted), historical.accepted, 50);
  assert.equal(result.perPortion.customNutrients.Maltitol.value, 1.5);
  assert.equal(result.per100g.customNutrients.Maltitol.value, 3);
  assert.ok(Math.abs(result.perPortion.energy - 17.15) < 1e-10);
});

test("exige revisão para fontes conflitantes, valores inválidos ou preparo", () => {
  const historical = [{ name: "Maltitol", amount: "1", unit: "g" }];
  assert.equal(reconcileHistoricalConstituents(historical, [{ maltitol: { value: 2, unit: "g" } }], false).accepted.length, 0);
  assert.equal(reconcileHistoricalConstituents(historical, [{ "Polióis totais": { value: 2, unit: "g" } }], false).issues.length, 1);
  assert.equal(reconcileHistoricalConstituents(historical, [{}], true).issues.length, 1);
  assert.equal(reconcileHistoricalConstituents([{ ...historical[0], unit: "ml" }], [{}], false).issues.length, 1);
  assert.equal(reconcileHistoricalConstituents([{ ...historical[0], amount: "NaN" }], [{}], false).issues.length, 1);
});

test("exige composição completa dos polióis antigos, inclusive com unidades diferentes", () => {
  const total = { name: "Polióis totais", amount: "1", unit: "g" };
  assert.equal(reconcileHistoricalConstituents([total], [], false).issues.length, 1);
  assert.equal(reconcileHistoricalConstituents([total, { name: "Maltitol", amount: "1000", unit: "mg" }], [], false).issues.length, 0);
  assert.equal(reconcileHistoricalConstituents([total, { name: "Maltitol", amount: "1500", unit: "mg" }], [], false).issues.length, 1);
});

test("normaliza unidades legadas de micrograma e converte sem alterar a escala", () => {
  const result = selectedConstituentRows(
    [{ name: "Cafeína" }],
    { customNutrients: { Cafeína: { value: 1, unit: "mg" } } },
    { customNutrients: { Cafeína: { value: 250, unit: "mcg" }, cafeína: { value: 0.5, unit: "mg" } } },
  );
  assert.equal(result[0].unit, "µg");
  assert.equal(result[0].per100, 1000);
  assert.equal(result[0].portion, 750);
});
