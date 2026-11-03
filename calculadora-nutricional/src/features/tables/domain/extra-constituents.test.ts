import { test } from "node:test";
import { strict as assert } from "node:assert";
import { selectedConstituentRows } from "./extra-constituents";

test("seleciona valores calculados, reconhece nomes antigos e soma unidades compatíveis", () => {
  const result = selectedConstituentRows(
    [{ name: "Polióis" }, { name: "Polióis totais" }, { name: "Isomalt" }, { name: "Cafeína" }],
    { customNutrients: { "Polióis totais": { value: 2, unit: "g" }, "Polióis": { value: 500, unit: "mg" }, Isomalte: { value: 1, unit: "g" } } },
    { customNutrients: { "Polióis totais": { value: 1, unit: "g" }, "Polióis": { value: 250, unit: "mg" }, Isomalte: { value: 0.5, unit: "g" } } },
  );
  assert.deepEqual(result.map(({ name, per100, portion }) => ({ name, per100, portion })), [
    { name: "Polióis totais", per100: 2.5, portion: 1.25 },
    { name: "Isomalte", per100: 1, portion: 0.5 },
    { name: "Cafeína", per100: undefined, portion: undefined },
  ]);
});

test("normaliza unidades legadas de micrograma e converte sem alterar a escala", () => {
  const result = selectedConstituentRows(
    [{ name: "Cafeína" }],
    { customNutrients: { Cafeína: { value: 1, unit: "mg" } } },
    { customNutrients: { Cafeína: { value: 250, unit: "mcg" }, cafeína: { value: 0.5, unit: "mg" } } },
  );
  assert.equal(result[0].unit, "µg");
  assert.equal(result[0].per100, 1000);
  assert.equal(result[0].portion, 750);
});
