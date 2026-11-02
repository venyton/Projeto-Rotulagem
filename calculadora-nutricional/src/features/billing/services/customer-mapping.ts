import "server-only";

import type { CustomerMappingInput } from "@/features/billing/domain/customer-mapping";
import { createAsaasBillingProvider } from "@/features/billing/integrations/asaas/asaas-provider";
import { ensureAsaasCustomerMappingWithClient } from "@/features/billing/persistence/customer-mapping-core";
import { prisma } from "@/lib/prisma";
import { ROLLOUT_FLAGS } from "@/features/rollout/domain/feature-flags";
import { requireRolloutFeature } from "@/features/rollout/services/feature-flags";

export { BillingCustomerMappingError } from "@/features/billing/persistence/customer-mapping-core";

export async function ensureAsaasCustomerMapping(rawInput: CustomerMappingInput) {
  await requireRolloutFeature(ROLLOUT_FLAGS.BILLING_ASAAS);
  const provider = await createAsaasBillingProvider();
  return ensureAsaasCustomerMappingWithClient(prisma, rawInput, provider);
}
