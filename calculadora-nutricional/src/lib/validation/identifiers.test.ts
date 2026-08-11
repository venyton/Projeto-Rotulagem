import assert from "node:assert/strict";
import test from "node:test";

import { barcodeSchema, isDatabaseId, isSafeResourceId, passwordResetTokenSchema, totpCodeSchema } from "./identifiers";

test("aceita CUIDs gerados pelo Prisma como IDs persistidos", () => {
  assert.equal(isDatabaseId("clw3f9z5a0000qwerty123456"), true);
  assert.equal(isDatabaseId("not-a-cuid"), false);
});

test("separa IDs de recurso externos de IDs persistidos", () => {
  assert.equal(isSafeResourceId("off-12345678"), true);
  assert.equal(isSafeResourceId("snapshot-clw3f9z5a0000qwerty123456"), true);
  assert.equal(isSafeResourceId("id com espaço"), false);
  assert.equal(isDatabaseId("off-12345678"), false);
});

test("mantém tokens e códigos com limites explícitos", () => {
  assert.equal(barcodeSchema.safeParse("7891234567890").success, true);
  assert.equal(barcodeSchema.safeParse("1234567").success, false);
  assert.equal(passwordResetTokenSchema.safeParse("a".repeat(64)).success, true);
  assert.equal(passwordResetTokenSchema.safeParse("g".repeat(64)).success, false);
  assert.equal(totpCodeSchema.safeParse("123456").success, true);
  assert.equal(totpCodeSchema.safeParse("12345 ").success, false);
});
