import assert from "node:assert/strict";
import test from "node:test";

import { optionalPackageContentSchema } from "./package-content";

test("conteúdo de embalagem vazio é tratado como ausente", () => {
  assert.equal(optionalPackageContentSchema.parse(0), undefined);
  assert.equal(optionalPackageContentSchema.parse(undefined), undefined);
});

test("mantém um conteúdo de embalagem positivo válido", () => {
  assert.equal(optionalPackageContentSchema.parse(100), 100);
  assert.equal(optionalPackageContentSchema.parse(0.0000001), 0.0000001);
  assert.equal(optionalPackageContentSchema.parse(10_000_000), 10_000_000);
});

test("rejeita valores negativos, não finitos e acima do limite", () => {
  for (const value of [-1, Infinity, NaN, 10_000_001, "100", null]) {
    assert.equal(optionalPackageContentSchema.safeParse(value).success, false);
  }
});
