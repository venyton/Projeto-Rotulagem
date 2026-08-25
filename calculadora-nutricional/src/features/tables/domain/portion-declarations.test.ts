import assert from "node:assert/strict";
import test from "node:test";

import { formatUnitFraction, getIndividualPackagePortion } from "./portion-declarations";

test("aplica a regra de embalagem individual na fronteira de duas porções", () => {
    assert.deepEqual(getIndividualPackagePortion(30, 50), {
        portion: 50,
        unitWeight: 50,
        measure: "1 unidade",
        useFullPackage: true,
    });
    assert.deepEqual(getIndividualPackagePortion(30, 60), {
        portion: 30,
        unitWeight: 60,
        measure: "1/2 unidade",
        useFullPackage: false,
    });
});

test("gera fração irredutível preservando o comportamento da interface", () => {
    assert.equal(formatUnitFraction(75, 50), "1 1/2 unidade");
    assert.equal(formatUnitFraction(0, 50), "");
});
