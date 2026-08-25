import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateServingsPerPackage,
  getAvailableExportSheetTypes,
  getRegulatoryComplianceWarnings,
  shouldShowDailyValue,
} from "./regulatory-declarations";

test("mantém a declaração automática de porções usada pela interface", () => {
  assert.equal(calculateServingsPerPackage(30, 90), "3");
  assert.equal(calculateServingsPerPackage(30, 100), "Cerca de 3");
  assert.equal(calculateServingsPerPackage(30, 60), "-");
});

test("centraliza categorias sem valor diário", () => {
  assert.equal(shouldShowDailyValue("general-food"), true);
  assert.equal(shouldShowDailyValue("infant-formula"), false);
  assert.equal(shouldShowDailyValue("enteral-formula"), false);
});

test("backend e interface compartilham os modelos permitidos para o contexto", () => {
  assert.deepEqual(getAvailableExportSheetTypes(true, 30), ["SUPLEM", "SUPLEM-POP"]);
  assert.equal(getAvailableExportSheetTypes(false, 30).includes("SUPLEM"), false);
  assert.equal(getAvailableExportSheetTypes(false, 30).includes("100"), false);
  assert.equal(getAvailableExportSheetTypes(false, 100).includes("100"), true);
});

test("avisos regulatórios não ficam codificados no componente cliente", () => {
  const warnings = getRegulatoryComplianceWarnings({
    enabled: true,
    complianceProfile: "iodized-salt",
    fopReferenceMode: "as-sold",
    category: "general-food",
    servingsDeclarationMode: "auto",
    manualServings: "",
  });
  assert.equal(warnings.some((warning) => warning.includes("sal iodado")), true);
});
