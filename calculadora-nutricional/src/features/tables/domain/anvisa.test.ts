import assert from "node:assert/strict";
import test from "node:test";
import { calculateVD, calculateVDFromDisplay, formatAnnexIvNutrientPair, formatOptionalNutrient } from "./anvisa";

const per100g = { energy: 480, carbs: 57, sugarTotal: 33, sugarAdded: 33, protein: 6.2, fatTotal: 25, fatSat: 4.6, fatTrans: 0.2, fiber: 1.2, sodium: 110 };
const perPortion = { energy: 287, carbs: 34, sugarTotal: 19.7, sugarAdded: 19.7, protein: 3.7, fatTotal: 15, fatSat: 2.8, fatTrans: 0.12, fiber: 0.7, sodium: 65 };

test("calcula o VD a partir da quantidade declarada arredondada", () => {
    for (const [key, reference, declared, expected] of [
        ["energy", 2000, "287", "14"],
        ["sugarAdded", 50, "20", "40"],
        ["fatTrans", 2, "0,1", "5"],
    ] as const) {
        const pair = formatAnnexIvNutrientPair(key, { per100g, perPortion });
        assert.equal(pair.portion, declared);
        assert.equal(calculateVD(pair.portionValue, reference), expected);
    }
});

test("energia e sódio seguem as casas decimais do Anexo III", () => {
    const values = { per100g: { ...per100g, energy: 44, sodium: 123 }, perPortion: { ...perPortion, energy: 44, sodium: 123 } };
    assert.equal(formatAnnexIvNutrientPair("energy", values).portion, "44");
    assert.equal(formatAnnexIvNutrientPair("sodium", values).portion, "123");
});

test("quantidade não significativa gera VD zero e ausência de referência permanece sem VD", () => {
    const zero = formatAnnexIvNutrientPair("fatTrans", { per100g: { ...per100g, fatTrans: 0.1 }, perPortion: { ...perPortion, fatTrans: 0.05 } });
    assert.equal(zero.portion, "0");
    assert.equal(calculateVD(zero.portionValue, 2), "0");
    assert.equal(calculateVDFromDisplay("0,1", null), "-");
});

test("micronutrientes usam a quantidade exibida no cálculo do VD", () => {
    const displayed = formatOptionalNutrient(0.14);
    assert.equal(displayed, "0,1");
    assert.equal(calculateVDFromDisplay(displayed, 2), "5");
});

test("arredonda nutrientes opcionais conforme unidade e faixa", () => {
    assert.equal(formatOptionalNutrient(3.26, "mg"), "3,3");
    assert.equal(formatOptionalNutrient(0.145, "mg"), "0,15");
    assert.equal(formatOptionalNutrient(0.14, "g"), "0,1");
});
