import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mapNutrientsToCustomIngredient, normalizeUnit } from "./technical-sheet-normalizer";

test("normaliza grafias de micrograma em fichas técnicas", () => {
  for (const unit of ["mcg", "ug", "µg", "μg"]) assert.equal(normalizeUnit(unit), "µg");
});

test("converte a quantidade importada para a unidade declarada do nutriente", () => {
  const result = mapNutrientsToCustomIngredient([
    { nutrientKey: "iodine", value: 0.15, unit: "mg", sourceText: "" },
    { nutrientKey: "calcium", value: 1000, unit: "µg", sourceText: "" },
    { nutrientKey: "omega3", value: 0.5, unit: "g", sourceText: "" },
  ]);
  assert.equal(result.iodine, 150);
  assert.equal(result.calcium, 1);
  assert.equal(result.omega3, 500);
});
