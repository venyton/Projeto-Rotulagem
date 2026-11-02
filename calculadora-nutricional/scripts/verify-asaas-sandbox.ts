import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { getAsaasConfiguration } from "../src/features/billing/integrations/asaas/asaas-settings";
import { AsaasHttpClient } from "../src/features/billing/integrations/asaas/asaas-http";

async function main() {
  const configuration = await getAsaasConfiguration();
  if (configuration.environment !== "sandbox" || !configuration.configured) {
    throw new Error("Contrato Asaas recusado: selecione Sandbox e configure a chave no registro global de configurações.");
  }

  const client = new AsaasHttpClient(configuration);
  const diagnostic = await client.diagnostic();
  assert.equal(diagnostic.status, "reachable");

  const externalReference = `soizi-stage5-${randomUUID()}`;
  let providerCustomerId: string | null = null;
  let cleaned = false;
  try {
    const created = await client.createCustomer({
      externalReference,
      name: "SoIZI Sandbox Etapa 05",
      cpfCnpj: "52998224725",
      email: "sandbox-etapa-05@example.test",
      notificationDisabled: true,
    });
    providerCustomerId = created.id;
    const [retrieved, listed] = await Promise.all([
      client.retrieveCustomer(created.id),
      client.findCustomerByExternalReference(externalReference),
    ]);
    assert.equal(retrieved.id, created.id);
    assert.equal(listed?.id, created.id);
    assert.equal(listed?.externalReference, externalReference);
  } finally {
    if (providerCustomerId) {
      const removal = await client.removeCustomer(providerCustomerId);
      cleaned = removal.deleted;
    }
  }
  assert.equal(cleaned, true);
  console.log(JSON.stringify({
    provider: "ASAAS",
    environment: "sandbox",
    diagnostic: "reachable",
    customerCreateRetrieveList: "passed",
    fixtureRemoved: cleaned,
  }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Falha desconhecida no contrato Sandbox.");
  process.exitCode = 1;
});
