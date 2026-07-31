import assert from "node:assert/strict";
import test from "node:test";

import { normalizeIngredientSearchText } from "./ingredient-search";

test("normalizes ingredient search text for accent-insensitive matching", () => {
  assert.equal(normalizeIngredientSearchText("  Açúcar   refinado "), "acucar refinado");
});
