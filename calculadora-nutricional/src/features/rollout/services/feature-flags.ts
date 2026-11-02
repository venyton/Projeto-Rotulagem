import "server-only";

import { getResolvedConfigurations } from "@/features/configuration/services/configuration-service";

import {
  ROLLOUT_FLAGS,
  resolveRolloutFlags,
  type RolloutFlagName,
} from "@/features/rollout/domain/feature-flags";

const DATABASE_ROLLOUT_KEYS = {
  [ROLLOUT_FLAGS.BILLING_ASAAS]: "business.billing.asaas.integration_enabled",
  [ROLLOUT_FLAGS.BILLING_CHECKOUT]: "business.billing.asaas.checkout_enabled",
  [ROLLOUT_FLAGS.BILLING_WEBHOOK_PROCESSING]: "business.billing.asaas.webhook_processing_enabled",
} as const;

export class RolloutFeatureDisabledError extends Error {
  constructor(public readonly flag: RolloutFlagName) {
    super(`Funcionalidade indisponível durante rollout: ${flag}.`);
    this.name = "RolloutFeatureDisabledError";
  }
}

export async function getRolloutFlags() {
  const resolved = await getResolvedConfigurations({ keys: Object.values(DATABASE_ROLLOUT_KEYS) });
  const source = { ...process.env };
  for (const flag of Object.keys(DATABASE_ROLLOUT_KEYS)) delete source[flag];
  for (const [flag, key] of Object.entries(DATABASE_ROLLOUT_KEYS)) {
    const value = resolved.get(key)?.value;
    source[flag] = value === true ? "true" : "false";
  }
  return resolveRolloutFlags(source);
}

export async function isRolloutFeatureEnabled(flag: RolloutFlagName) {
  return (await getRolloutFlags())[flag];
}

export async function requireRolloutFeature(flag: RolloutFlagName) {
  if (!await isRolloutFeatureEnabled(flag)) throw new RolloutFeatureDisabledError(flag);
}
