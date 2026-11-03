import assert from "node:assert/strict";
import test from "node:test";
import { arrangeAnnexXiExtras, sortAnnexXiRows } from "./annex-xi-order";

test("posiciona gorduras, vitaminas e minerais na ordem do Anexo XI", () => {
  const keys = ["sodium", "chloride", "fatPoly", "fatTrans", "phosphorus", "fatMono", "omega3", "fiber", "omega6", "cholesterol", "biotin", "pantothenicAcid"];
  assert.deepEqual(sortAnnexXiRows(keys.map((orderKey) => ({ orderKey }))).map((row) => row.orderKey), [
    "fatTrans", "fatMono", "fatPoly", "omega6", "omega3", "cholesterol", "fiber", "sodium", "pantothenicAcid", "biotin", "chloride", "phosphorus",
  ]);
});

test("ordena carboidratos extras conforme os grupos do Anexo XI", () => {
  const result = arrangeAnnexXiExtras([
    "Cafeína", "Sorbitol", "Polidextrose", "Galactose", "Polióis totais", "Lactose", "Creatina",
  ].map((name) => ({ name })));
  assert.deepEqual(result.carbohydrates.map(({ item, indentLevel }) => [item.name, indentLevel]), [
    ["Lactose", 2], ["Galactose", 2], ["Polióis totais", 1], ["Sorbitol", 2],
  ]);
  assert.deepEqual(result.remaining.map(({ name }) => name), ["Cafeína", "Polidextrose", "Creatina"]);
});
