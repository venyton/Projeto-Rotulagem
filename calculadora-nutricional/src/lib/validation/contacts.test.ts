import assert from "node:assert/strict";
import test from "node:test";

import { isValidEmail, normalizeEmail, parseEmail } from "./contacts";

test("normaliza e valida e-mails com um contrato único", () => {
  assert.equal(normalizeEmail("  Pessoa@Empresa.COM "), "pessoa@empresa.com");
  assert.equal(parseEmail("  Pessoa@Empresa.COM "), "pessoa@empresa.com");
  assert.equal(isValidEmail("pessoa@empresa.com"), true);
  assert.equal(isValidEmail("a@b..c"), false);
  assert.equal(isValidEmail(".pessoa@empresa.com"), false);
});
