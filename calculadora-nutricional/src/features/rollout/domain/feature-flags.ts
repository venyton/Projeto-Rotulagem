export const ROLLOUT_FLAGS = {
  CONTROL_PLANE: "CONTROL_PLANE_ENABLED",
  BILLING_ASAAS: "BILLING_ASAAS_ENABLED",
  BILLING_CHECKOUT: "BILLING_CHECKOUT_ENABLED",
  BILLING_WEBHOOK_PROCESSING: "BILLING_WEBHOOK_PROCESSING_ENABLED",
  CUSTOMER_PLAN_UI: "CUSTOMER_PLAN_UI_ENABLED",
  PIX_AUTOMATICO: "PIX_AUTOMATICO_ENABLED",
  TREASURY_AUTOMATION: "TREASURY_AUTOMATION_ENABLED",
} as const;

export type RolloutFlagName = typeof ROLLOUT_FLAGS[keyof typeof ROLLOUT_FLAGS];
export type RolloutFlagState = Record<RolloutFlagName, boolean>;

export class RolloutConfigurationError extends Error {
  constructor(public readonly code: "UNSUPPORTED_FEATURE" | "MISSING_DEPENDENCY") {
    super(`Configuração de rollout recusada: ${code}.`);
    this.name = "RolloutConfigurationError";
  }
}
function enabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

export function resolveRolloutFlags(source: Record<string, string | undefined>): RolloutFlagState {
  const state = Object.fromEntries(
    Object.values(ROLLOUT_FLAGS).map((flag) => [flag, enabled(source[flag])]),
  ) as RolloutFlagState;

  if (state.PIX_AUTOMATICO_ENABLED || state.TREASURY_AUTOMATION_ENABLED) {
    throw new RolloutConfigurationError("UNSUPPORTED_FEATURE");
  }
  if (state.BILLING_CHECKOUT_ENABLED && !state.BILLING_ASAAS_ENABLED) {
    throw new RolloutConfigurationError("MISSING_DEPENDENCY");
  }
  return state;
}

// As flags de cobrança são definidas no banco, nunca por variáveis legadas.
export function resolveEnvironmentRolloutFlags(source: Record<string, string | undefined>): RolloutFlagState {
  const environment = { ...source };
  delete environment[ROLLOUT_FLAGS.BILLING_ASAAS];
  delete environment[ROLLOUT_FLAGS.BILLING_CHECKOUT];
  delete environment[ROLLOUT_FLAGS.BILLING_WEBHOOK_PROCESSING];
  return resolveRolloutFlags(environment);
}
