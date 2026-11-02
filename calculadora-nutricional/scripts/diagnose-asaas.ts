import { createAsaasBillingProvider } from "../src/features/billing/integrations/asaas/asaas-provider";

async function main() {
  const diagnostic = await (await createAsaasBillingProvider()).diagnostic();
  console.log(JSON.stringify(diagnostic));
}

main().catch((error) => {
  console.error(JSON.stringify({
    provider: "ASAAS",
    status: "configuration_error",
    errorCode: error instanceof Error ? error.name : "UNKNOWN",
  }));
  process.exitCode = 1;
});
