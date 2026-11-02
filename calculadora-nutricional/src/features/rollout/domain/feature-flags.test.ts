import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveRolloutFlags,
  RolloutConfigurationError,
} from "./feature-flags";

test("mantém todas as superfícies de rollout desligadas por padrão", () => {
  assert.deepEqual(resolveRolloutFlags({}), {
    CONTROL_PLANE_ENABLED: false,
    BILLING_ASAAS_ENABLED: false,
    BILLING_CHECKOUT_ENABLED: false,
    BILLING_WEBHOOK_PROCESSING_ENABLED: false,
    CUSTOMER_PLAN_UI_ENABLED: false,
    PIX_AUTOMATICO_ENABLED: false,
    TREASURY_AUTOMATION_ENABLED: false,
  });
});
test("aceita somente true explícito e exige Asaas antes do checkout", () => {
  assert.equal(resolveRolloutFlags({ CONTROL_PLANE_ENABLED: " TRUE " }).CONTROL_PLANE_ENABLED, true);
  assert.throws(
    () => resolveRolloutFlags({ BILLING_CHECKOUT_ENABLED: "true" }),
    (error) => error instanceof RolloutConfigurationError && error.code === "MISSING_DEPENDENCY",
  );
  assert.equal(resolveRolloutFlags({ BILLING_ASAAS_ENABLED: "true", BILLING_CHECKOUT_ENABLED: "true" }).BILLING_CHECKOUT_ENABLED, true);
});

test("recusa habilitar Pix automático ou tesouraria ainda não implementados", () => {
  for (const flag of ["PIX_AUTOMATICO_ENABLED", "TREASURY_AUTOMATION_ENABLED"]) {
    assert.throws(
      () => resolveRolloutFlags({ [flag]: "true" }),
      (error) => error instanceof RolloutConfigurationError && error.code === "UNSUPPORTED_FEATURE",
    );
  }
});
