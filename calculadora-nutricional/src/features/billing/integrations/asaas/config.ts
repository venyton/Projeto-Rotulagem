import { BillingProviderError } from "../../domain/billing-provider";

export type AsaasEnvironment = "sandbox" | "production";

export type AsaasConfigurationSource = {
  environment?: string;
  apiKey?: string | null;
  webhookAuthToken?: string | null;
  productionEnabled?: boolean;
  runtimeEnvironment?: string;
};

export type AsaasConfiguration = {
  environment: AsaasEnvironment;
  baseUrl: string;
  baseHost: string;
  apiKey: string | null;
  webhookAuthToken: string | null;
  configured: boolean;
};

const baseUrls: Record<AsaasEnvironment, string> = {
  sandbox: "https://api-sandbox.asaas.com/v3",
  production: "https://api.asaas.com/v3",
};

export function getAsaasBaseUrl(environment: AsaasEnvironment) {
  return baseUrls[environment];
}

export function resolveAsaasConfiguration(
  source: AsaasConfigurationSource = {},
): AsaasConfiguration {
  const environment = (source.environment?.trim().toLowerCase() || "sandbox") as AsaasEnvironment;
  if (environment !== "sandbox" && environment !== "production") {
    throw new BillingProviderError("INVALID_CONFIGURATION");
  }
  if (
    environment === "production"
    && (source.runtimeEnvironment !== "production" || source.productionEnabled !== true)
  ) {
    throw new BillingProviderError("INVALID_CONFIGURATION");
  }

  const apiKey = source.apiKey?.trim() || null;
  const expectedPrefix = environment === "sandbox" ? "$aact_hmlg_" : "$aact_prod_";
  if (apiKey && !apiKey.startsWith(expectedPrefix)) {
    throw new BillingProviderError("INVALID_CONFIGURATION");
  }

  const webhookAuthToken = source.webhookAuthToken?.trim() || null;
  if (
    webhookAuthToken
    && (webhookAuthToken.length < 32 || webhookAuthToken.length > 255 || /\s/.test(webhookAuthToken))
  ) {
    throw new BillingProviderError("INVALID_CONFIGURATION");
  }
  if (webhookAuthToken && apiKey && webhookAuthToken === apiKey) {
    throw new BillingProviderError("INVALID_CONFIGURATION");
  }

  const baseUrl = getAsaasBaseUrl(environment);
  return {
    environment,
    baseUrl,
    baseHost: new URL(baseUrl).host,
    apiKey,
    webhookAuthToken,
    configured: Boolean(apiKey),
  };
}
