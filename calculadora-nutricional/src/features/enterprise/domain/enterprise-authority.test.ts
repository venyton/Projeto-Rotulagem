import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAuthoritativeEnterpriseTable,
  canSetEnterpriseApprovalStatus,
  type EnterpriseTable,
} from "./enterprise";

const trustedBase: EnterpriseTable = {
  id: "clw3f9z5a0000qwerty123456",
  title: "Produto base",
  portion: 30,
  uom: "g",
  householdMeasure: "1 unidade",
  popGroup: "adultos",
  packageContent: 90,
  servingsPerPackage: "3",
  items: [{
    name: "Ingrediente confiável",
    quantity: 100,
    energy: 10,
    carbs: 2,
    protein: 1,
    fatTotal: 0,
    fatSat: 0,
    fatTrans: 0,
    fiber: 0,
    sodium: 5,
  }],
};

test("preserva a localização e rejeita nutrientes forjados no cliente", () => {
  const localizedDraft: EnterpriseTable = {
    ...trustedBase,
    id: `${trustedBase.id}-us-draft`,
    title: "Localized product",
    portion: 40,
    householdMeasure: "2 pieces",
    items: [{ ...trustedBase.items[0], energy: 999_999, sodium: 999_999 }],
  };

  const result = buildAuthoritativeEnterpriseTable(trustedBase, localizedDraft);

  assert.equal(result.id, trustedBase.id);
  assert.equal(result.title, "Localized product");
  assert.equal(result.portion, 40);
  assert.equal(result.items[0].energy, 10);
  assert.equal(result.items[0].sodium, 5);
  assert.notEqual(result.items, trustedBase.items);
});

test("normaliza campos de localização sem perder a autoridade da tabela-base", () => {
    const authoritative = buildAuthoritativeEnterpriseTable(trustedBase, {
        title: "Produto legado",
        portion: Number.NaN,
        uom: "",
        householdMeasure: "",
        packageContent: -1,
        servingsPerPackage: "x".repeat(200),
        items: [{ ...trustedBase.items[0], sodium: 0 }],
    });

    assert.equal(authoritative.title, "Produto legado");
    assert.equal(authoritative.portion, trustedBase.portion);
    assert.equal(authoritative.uom, trustedBase.uom);
    assert.equal(authoritative.householdMeasure, trustedBase.householdMeasure);
    assert.equal(authoritative.packageContent, trustedBase.packageContent);
    assert.equal(authoritative.items[0].sodium, trustedBase.items[0].sodium);
});

test("aprovação final exige autoridade administrativa no backend", () => {
  assert.equal(canSetEnterpriseApprovalStatus("regulatory", false), true);
  assert.equal(canSetEnterpriseApprovalStatus("approved", false), false);
  assert.equal(canSetEnterpriseApprovalStatus("approved", true), true);
});
