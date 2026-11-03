import assert from "node:assert/strict";
import test from "node:test";

import { BillingProviderError } from "../../domain/billing-provider";
import { resolveAsaasConfiguration } from "./config";

test("deriva host Sandbox sem aceitar URL configurável", () => {
  const result = resolveAsaasConfiguration({
    runtimeEnvironment: "development",
    environment: "sandbox",
    apiKey: "$aact_hmlg_test",
  });
  assert.equal(result.baseUrl, "https://api-sandbox.asaas.com/v3");
  assert.equal(result.baseHost, "api-sandbox.asaas.com");
  assert.equal(result.configured, true);
});

test("recusa produção fora de runtime produtivo e sem gate explícito", () => {
  assert.throws(
    () => resolveAsaasConfiguration({
      environment: "production",
      apiKey: "$aact_prod_test",
      productionEnabled: true,
      runtimeEnvironment: "development",
    }),
    (error) => error instanceof BillingProviderError && error.code === "INVALID_CONFIGURATION",
  );
  assert.throws(
    () => resolveAsaasConfiguration({
      environment: "production",
      apiKey: "$aact_prod_test",
      productionEnabled: false,
      runtimeEnvironment: "production",
    }),
    (error) => error instanceof BillingProviderError && error.code === "INVALID_CONFIGURATION",
  );
});

test("recusa chave de ambiente incompatível e token webhook inseguro", () => {
  assert.throws(
    () => resolveAsaasConfiguration({ environment: "sandbox", apiKey: "$aact_prod_test" }),
    (error) => error instanceof BillingProviderError && error.code === "INVALID_CONFIGURATION",
  );
  assert.throws(
    () => resolveAsaasConfiguration({
      environment: "sandbox",
      webhookAuthToken: "curto",
    }),
    (error) => error instanceof BillingProviderError && error.code === "INVALID_CONFIGURATION",
  );
});

test("configuração sem chave permanece diagnosticável e sem chamada externa", () => {
  const result = resolveAsaasConfiguration({ environment: "sandbox" });
  assert.equal(result.configured, false);
  assert.equal(result.apiKey, null);
});
