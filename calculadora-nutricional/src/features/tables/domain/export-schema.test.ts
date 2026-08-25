import test from "node:test";
import assert from "node:assert/strict";

import {
  authoritativeCompleteExportRequestSchema,
  authoritativeExportRequestSchema,
  completeExportBodySchema,
  exportBodySchema,
  imageDataUrlSchema,
} from "./export-schema";

const validNutrients = {
  energy: 100,
  carbs: 10,
  sugarTotal: 2,
  sugarAdded: 1,
  protein: 5,
  fatTotal: 3,
  fatSat: 1,
  fatTrans: 0,
  fiber: 2,
  sodium: 100,
  customNutrients: {},
};

test("export schema fills optional nutrient fields safely", () => {
  const parsed = exportBodySchema.safeParse({
    portionSize: 30,
    per100g: validNutrients,
    perPortion: validNutrients,
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.per100g.vitaminC, 0);
    assert.equal(parsed.data.showDailyValue, true);
  }
});

test("export schema rejects non-finite and negative nutrient values", () => {
  const invalid = exportBodySchema.safeParse({
    portionSize: 30,
    per100g: { ...validNutrients, energy: Number.POSITIVE_INFINITY },
    perPortion: { ...validNutrients, sodium: -1 },
  });

  assert.equal(invalid.success, false);
});

test("complete export schema validates image data and model keys", () => {
  const invalid = completeExportBodySchema.safeParse({
    portionSize: 30,
    per100g: validNutrients,
    perPortion: validNutrients,
    imageDataUrls: {
      "unexpected/model": "data:image/png;base64,not-a-valid-base64-payload",
    },
  });

  assert.equal(invalid.success, false);
});

test("image data URL aceita somente Base64 canônico", () => {
  assert.equal(imageDataUrlSchema.safeParse("data:image/png;base64,YWJj").success, true);
  assert.equal(imageDataUrlSchema.safeParse("data:image/png;base64,YWJj=").success, false);
  assert.equal(imageDataUrlSchema.safeParse("data:image/png;base64,YW\njj").success, false);
});

test("endpoint autoritativo aceita somente a referência da tabela persistida", () => {
  const tableId = "clw3f9z5a0000qwerty123456";
  assert.equal(authoritativeExportRequestSchema.safeParse({ tableId }).success, true);
  assert.equal(authoritativeCompleteExportRequestSchema.safeParse({ tableId }).success, true);
  assert.equal(authoritativeExportRequestSchema.safeParse({
    tableId,
    per100g: { ...validNutrients, sodium: 999_999 },
  }).success, false);
});
