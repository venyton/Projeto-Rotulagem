import "server-only";

import { createAsaasBillingProvider } from "@/features/billing/integrations/asaas/asaas-provider";
import { getAsaasSetupStatus } from "@/features/billing/integrations/asaas/asaas-settings";
import { ROLLOUT_FLAGS } from "@/features/rollout/domain/feature-flags";
import { isRolloutFeatureEnabled } from "@/features/rollout/services/feature-flags";

export async function getAsaasProviderDiagnostic() {
  const [configuration, enabled] = await Promise.all([
    getAsaasSetupStatus(),
    isRolloutFeatureEnabled(ROLLOUT_FLAGS.BILLING_ASAAS),
  ]);
  const baseline = {
    provider: "ASAAS" as const,
    environment: configuration.environment,
    configured: configuration.configured,
    baseHost: new URL(configuration.baseUrl).host,
  };

  if (!configuration.configured || !enabled) {
    return {
      ...baseline,
      configured: false,
      status: "not_configured" as const,
      latencyMs: null,
      errorCode: !enabled ? "ROLLOUT_DISABLED" : configuration.errorCode ?? "NOT_CONFIGURED",
    };
  }

  try {
    return await (await createAsaasBillingProvider()).diagnostic();
  } catch {
    return {
      ...baseline,
      status: "not_configured" as const,
      latencyMs: null,
      errorCode: "INVALID_CONFIGURATION",
    };
  }
}
