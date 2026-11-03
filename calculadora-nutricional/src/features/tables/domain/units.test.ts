import { test } from "node:test";
import { strict as assert } from "node:assert";
import { normalizeMicrogramSymbol } from "./units";
import { MICRONUTRIENTS } from "./micronutrients";

test("padroniza grafias legadas sem modificar outras unidades", () => {
  for (const unit of ["mcg", "ug", "µg", "μg", "micrograma", "microgramas"]) {
    assert.equal(normalizeMicrogramSymbol(unit), "µg");
  }
  for (const unit of ["g", "mg", "kcal", "ml", "UFC"]) {
    assert.equal(normalizeMicrogramSymbol(unit), unit);
  }
});

test("unidades dos micronutrientes seguem a IN 75, anexos II e XI", () => {
  const micrograms = ["copper", "selenium", "chromium", "molybdenum", "iodine", "vitaminA", "vitaminD", "vitaminK", "biotin", "folicAcid", "vitaminB12"];
  assert.deepEqual(MICRONUTRIENTS.filter((item) => item.unit === "µg").map((item) => item.name).sort(), micrograms.sort());
  assert.equal(MICRONUTRIENTS.find((item) => item.name === "omega3")?.unit, "mg");
  assert.equal(MICRONUTRIENTS.find((item) => item.name === "omega6")?.unit, "g");
});
