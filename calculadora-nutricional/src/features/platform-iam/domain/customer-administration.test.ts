import assert from "node:assert/strict";
import test from "node:test";

import {
  assertOrganizationStatusTransition,
  maskedDocumentLabel,
  parseOrganizationAdminFilters,
  sanitizeAdministrativeReason,
} from "./customer-administration";

test("normaliza filtros administrativos e limita paginação", () => {
  assert.deepEqual(parseOrganizationAdminFilters({
    page: "99999",
    q: "  Acme  ",
    status: "suspended",
    billing: "past_due",
    plan: "standard",
  }), {
    page: 1_000,
    query: "Acme",
    status: "SUSPENDED",
    billing: "PAST_DUE",
    plan: "standard",
  });
});

test("documento administrativo contém somente os quatro últimos dígitos", () => {
  assert.equal(maskedDocumentLabel({ kind: "COMPANY", cpfLastFour: null, cnpjLastFour: "1234" }), "CNPJ •••• 1234");
  assert.equal(maskedDocumentLabel({ kind: "INDIVIDUAL", cpfLastFour: "9876", cnpjLastFour: null }), "CPF •••• 9876");
});

test("status administrativo só alterna entre ativo e suspenso", () => {
  assert.doesNotThrow(() => assertOrganizationStatusTransition("ACTIVE", "SUSPENDED"));
  assert.doesNotThrow(() => assertOrganizationStatusTransition("SUSPENDED", "ACTIVE"));
  assert.throws(() => assertOrganizationStatusTransition("ARCHIVED", "ACTIVE"));
  assert.throws(() => assertOrganizationStatusTransition("ACTIVE", "ARCHIVED"));
});

test("justificativa é obrigatória e limitada", () => {
  assert.equal(sanitizeAdministrativeReason("  Solicitação validada pelo financeiro. "), "Solicitação validada pelo financeiro.");
  assert.throws(() => sanitizeAdministrativeReason("curta"));
  assert.throws(() => sanitizeAdministrativeReason("x".repeat(501)));
});
