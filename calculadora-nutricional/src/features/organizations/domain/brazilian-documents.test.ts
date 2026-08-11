import test from "node:test";
import assert from "node:assert/strict";

import { isValidCnpj, isValidCpf, normalizeBrazilianDocument } from "./brazilian-documents";

test("normaliza documentos brasileiros", () => {
  assert.equal(normalizeBrazilianDocument("529.982.247-25"), "52998224725");
  assert.equal(normalizeBrazilianDocument("04.252.011/0001-10"), "04252011000110");
  assert.equal(normalizeBrazilianDocument("abc529.982.247-25"), "");
  assert.equal(normalizeBrazilianDocument("529.982/247-25"), "");
});

test("valida CPF pelo dígito verificador e rejeita sequências repetidas", () => {
  assert.equal(isValidCpf("529.982.247-25"), true);
  assert.equal(isValidCpf("529.982.247-24"), false);
  assert.equal(isValidCpf("111.111.111-11"), false);
  assert.equal(isValidCpf("abc529.982.247-25"), false);
});

test("valida CNPJ pelo dígito verificador e rejeita sequências repetidas", () => {
  assert.equal(isValidCnpj("04.252.011/0001-10"), true);
  assert.equal(isValidCnpj("04.252.011/0001-11"), false);
  assert.equal(isValidCnpj("11.111.111/1111-11"), false);
  assert.equal(isValidCnpj("abc04.252.011/0001-10"), false);
});
