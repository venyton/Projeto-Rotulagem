import "server-only";

import { AsaasHttpClient } from "./asaas-http";
import { getAsaasConfiguration } from "./asaas-settings";

export async function createAsaasBillingProvider() {
  return new AsaasHttpClient(await getAsaasConfiguration());
}
