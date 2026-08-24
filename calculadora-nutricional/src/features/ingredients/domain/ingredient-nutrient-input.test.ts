import assert from "node:assert/strict";
import test from "node:test";

import { parseOptionalNutrientNumber } from "./ingredient-nutrient-input";

test("aceita campo vazio e números válidos sem alterar o valor", () => {
  assert.deepEqual(parseOptionalNutrientNumber(""), { ok: true, value: null });
  assert.deepEqual(parseOptionalNutrientNumber("12,5"), { ok: true, value: 12.5 });
  assert.deepEqual(parseOptionalNutrientNumber("0"), { ok: true, value: 0 });
});

test("rejeita valores que antes poderiam ser silenciosamente convertidos em zero", () => {
  assert.deepEqual(parseOptionalNutrientNumber("-1"), { ok: false });
  assert.deepEqual(parseOptionalNutrientNumber("não é número"), { ok: false });
  assert.deepEqual(parseOptionalNutrientNumber("1000000001"), { ok: false });
});
