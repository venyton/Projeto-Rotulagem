import assert from "node:assert/strict";
import test from "node:test";

import { decimalText, isRepresentableDecimalInput, shiftDecimalInput } from "./decimal-display";

test("apresenta valores pequenos sem arredondar para zero", () => {
  assert.equal(decimalText(0.00005), "0.00005");
  assert.equal(decimalText(0.00000001), "0.00000001");
  assert.equal(decimalText(1e-20), "0.00000000000000000001");
  assert.equal(decimalText(1.25e21), "1250000000000000000000");
});

test("converte unidades movendo a vírgula sem arredondar", () => {
  assert.equal(shiftDecimalInput("0,05", -3), "0.00005");
  assert.equal(shiftDecimalInput("0.00005", 3), "0.05");
  assert.equal(shiftDecimalInput("0.00005", 6), "50");
  assert.equal(shiftDecimalInput("0,00000000000000001", -3), "0.00000000000000000001");
  assert.equal(shiftDecimalInput("abc", -3), null);
});

test("não converte silenciosamente entrada decimal para outro valor", () => {
  assert.equal(isRepresentableDecimalInput("0,0000500"), true);
  assert.equal(isRepresentableDecimalInput("1,00000000000000001"), false);
  assert.equal(isRepresentableDecimalInput(`0.${"0".repeat(324)}1`), false);
});
