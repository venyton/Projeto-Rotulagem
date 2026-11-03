import assert from "node:assert/strict";
import test from "node:test";

import { fitsIngredientPrecision, isValidIngredientPrecision } from "./ingredient-precision";

test("valida a precisão configurável", () => {
  assert.equal(isValidIngredientPrecision(15), true);
  assert.equal(isValidIngredientPrecision(16), false);
  assert.equal(isValidIngredientPrecision(-1), false);
  assert.equal(isValidIngredientPrecision(1.5), false);
});

test("aplica o limite à quantidade sem arredondá-la", () => {
  assert.equal(fitsIngredientPrecision(0.00005, 5), true);
  assert.equal(fitsIngredientPrecision(0.00005, 4), false);
  assert.equal(fitsIngredientPrecision(0.000000000000001, 15), true);
  assert.equal(fitsIngredientPrecision(1e-16, 15), false);
  assert.equal(fitsIngredientPrecision(Infinity, 15), false);
});
