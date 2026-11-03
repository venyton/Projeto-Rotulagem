import assert from "node:assert/strict";
import test from "node:test";

import { FOOD_GROUPS } from "./food-groups";
import { HOUSEHOLD_MEASURE_CODES, parseHouseholdMeasureValue } from "./household-measures";

const products = FOOD_GROUPS.flatMap((group) => group.products);

test("barra de cereais até 10% segue a porção e medida do Anexo V", () => {
    const product = products.find((item) => item.name === "Barra de cereais com até 10% de gordura");
    assert.ok(product);
    assert.equal(product.portion, 30);
    assert.equal(parseHouseholdMeasureValue(product.measure).code, HOUSEHOLD_MEASURE_CODES.UNIT);
});

test("referências que dependem de preparo ou características não viram porção fixa", () => {
    const cases = [
        ["Leite em pó", "Quantidade suficiente para preparar 200 ml"],
        ["Ovo", "Quantidade que corresponda a 1 unidade"],
        ["Sorvetes de massa", "60 g ou 130 ml"],
        ["Pós para preparar molhos", "Quantidade suficiente para preparar 2 colheres de sopa"],
        ["Bebidas alcoólicas", "Quantidade equivalente a 10 g de etanol"],
    ];
    for (const [name, description] of cases) {
        const product = products.find((item) => item.name === name);
        assert.ok(product, name);
        assert.equal(product.portion, 0, name);
        assert.equal(product.portionDescription, description, name);
    }
    assert.equal(products.filter((item) => item.portionDescription).length, 23);
});
