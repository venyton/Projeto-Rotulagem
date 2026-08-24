import assert from "node:assert/strict";
import test from "node:test";

import { validateOrganizationIdentity } from "./organization-identity";

test("pessoa física exige nome e CPF e descarta campos empresariais", () => {
    const result = validateOrganizationIdentity({
        kind: "INDIVIDUAL",
        personName: "Maria da Silva",
        cpf: "529.982.247-25",
        legalName: "Campo indevido",
        tradeName: "Campo indevido",
        cnpj: "04.252.011/0001-10",
    });

    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.personName, "Maria da Silva");
    assert.equal(result.data.legalName, "");
    assert.equal(result.data.tradeName, "");
    assert.equal(result.data.cnpj, "");
});

test("pessoa jurídica exige razão social e CNPJ e descarta campos pessoais", () => {
    const result = validateOrganizationIdentity({
        kind: "COMPANY",
        personName: "Campo indevido",
        cpf: "529.982.247-25",
        legalName: "SoIZI Alimentos Ltda.",
        tradeName: "SoIZI",
        cnpj: "04.252.011/0001-10",
    });

    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.legalName, "SoIZI Alimentos Ltda.");
    assert.equal(result.data.personName, "");
    assert.equal(result.data.cpf, "");
});

test("edição aceita documento em branco somente quando já existe hash persistido", () => {
    const withoutStoredCpf = validateOrganizationIdentity({
        kind: "INDIVIDUAL",
        personName: "Maria da Silva",
        cpf: "",
        legalName: "",
        tradeName: "",
        cnpj: "",
    });
    const withStoredCpf = validateOrganizationIdentity({
        kind: "INDIVIDUAL",
        personName: "Maria da Silva",
        cpf: "",
        legalName: "",
        tradeName: "",
        cnpj: "",
    }, { hasCpf: true, hasCnpj: false });

    assert.deepEqual(withoutStoredCpf, { success: false, error: "individual_identity" });
    assert.equal(withStoredCpf.success, true);
});
