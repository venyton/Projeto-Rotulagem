import assert from "node:assert/strict";
import test from "node:test";
import { isValidExactQuantity } from "./exact-quantity";

test("valida a quantidade decimal e seu valor aproximado", () => {
  assert.equal(isValidExactQuantity("0.00000000000000000005", 5e-20), true);
  assert.equal(isValidExactQuantity(`0.${"0".repeat(79)}1`, 1e-80), true);
  assert.equal(isValidExactQuantity("1.0000000000000001", 1), true);
  assert.equal(isValidExactQuantity("10000000.0000000001", 10000000), false);
  assert.equal(isValidExactQuantity("1.1", 1), false);
  assert.equal(isValidExactQuantity("0", 0), false);
  assert.equal(isValidExactQuantity(`0.${"0".repeat(80)}1`, 1e-81), false);
});
