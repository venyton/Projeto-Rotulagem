import "server-only";

import { ConfigurationScope, Prisma } from "@prisma/client";

import { BillingProviderError } from "@/features/billing/domain/billing-provider";
import { getResolvedConfigurations } from "@/features/configuration/services/configuration-service";
import { prisma } from "@/lib/prisma";

import {
  resolveAsaasConfiguration,
  getAsaasBaseUrl,
  type AsaasConfiguration,
  type AsaasEnvironment,
} from "./config";

const KEYS = {
  environment: "business.billing.environment",
  productionEnabled: "business.billing.asaas.production_enabled",
  sandboxApiKey: "business.billing.asaas.sandbox_api_key",
  productionApiKey: "business.billing.asaas.production_api_key",
  webhookName: "business.billing.asaas.webhook.name",
  webhookUrl: "business.billing.asaas.webhook.url",
  webhookEmail: "business.billing.asaas.webhook.email",
  webhookEnabled: "business.billing.asaas.webhook.enabled",
  webhookInterrupted: "business.billing.asaas.webhook.interrupted",
  webhookApiVersion: "business.billing.asaas.webhook.api_version",
  webhookSendType: "business.billing.asaas.webhook.send_type",
  webhookEvents: "business.billing.asaas.webhook.events",
  sandboxWebhookId: "business.billing.asaas.webhook.sandbox_id",
  productionWebhookId: "business.billing.asaas.webhook.production_id",
  sandboxWebhookAuthToken: "business.billing.asaas.webhook.sandbox_auth_token",
  productionWebhookAuthToken: "business.billing.asaas.webhook.production_auth_token",
} as const;

const DEFAULT_EVENTS = [
  "CHECKOUT_CREATED",
  "CHECKOUT_CANCELED",
  "CHECKOUT_EXPIRED",
  "CHECKOUT_PAID",
  "SUBSCRIPTION_CREATED",
  "SUBSCRIPTION_UPDATED",
  "SUBSCRIPTION_INACTIVATED",
  "SUBSCRIPTION_DELETED",
  "PAYMENT_CREATED",
  "PAYMENT_UPDATED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_OVERDUE",
  "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
  "PAYMENT_REFUNDED",
  "PAYMENT_CHARGEBACK_REQUESTED",
];

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function asEvents(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value as string[]
    : DEFAULT_EVENTS;
}

async function readSettings() {
  const shared = await getResolvedConfigurations({ keys: [
    KEYS.environment,
    KEYS.productionEnabled,
    KEYS.webhookName,
    KEYS.webhookUrl,
    KEYS.webhookEmail,
    KEYS.webhookEnabled,
    KEYS.webhookInterrupted,
    KEYS.webhookApiVersion,
    KEYS.webhookSendType,
    KEYS.webhookEvents,
  ] });
  const environmentValue = asString(shared.get(KEYS.environment)?.value, "sandbox");
  if (environmentValue !== "sandbox" && environmentValue !== "production") {
    throw new BillingProviderError("INVALID_CONFIGURATION");
  }
  const environment: AsaasEnvironment = environmentValue;
  const environmentKeys = environment === "sandbox"
    ? [KEYS.sandboxApiKey, KEYS.sandboxWebhookId, KEYS.sandboxWebhookAuthToken]
    : [KEYS.productionApiKey, KEYS.productionWebhookId, KEYS.productionWebhookAuthToken];
  const secrets = await getResolvedConfigurations({ keys: environmentKeys });
  const value = (key: string) => secrets.get(key)?.value ?? shared.get(key)?.value;

  return {
    environment,
    productionEnabled: asBoolean(value(KEYS.productionEnabled), false),
    sandboxApiKey: asString(value(KEYS.sandboxApiKey)) || null,
    productionApiKey: asString(value(KEYS.productionApiKey)) || null,
    webhook: {
      name: asString(value(KEYS.webhookName), "SoIZI Billing Webhook"),
      url: asString(value(KEYS.webhookUrl)),
      email: asString(value(KEYS.webhookEmail)),
      enabled: asBoolean(value(KEYS.webhookEnabled), true),
      interrupted: asBoolean(value(KEYS.webhookInterrupted), false),
      apiVersion: typeof value(KEYS.webhookApiVersion) === "number" ? value(KEYS.webhookApiVersion) as number : 3,
      sendType: asString(value(KEYS.webhookSendType), "SEQUENTIALLY"),
      events: asEvents(value(KEYS.webhookEvents)),
      sandboxId: asString(value(KEYS.sandboxWebhookId)) || null,
      productionId: asString(value(KEYS.productionWebhookId)) || null,
      sandboxAuthToken: asString(value(KEYS.sandboxWebhookAuthToken)) || null,
      productionAuthToken: asString(value(KEYS.productionWebhookAuthToken)) || null,
    },
  };
}

export async function getAsaasConfiguration(): Promise<AsaasConfiguration> {
  const settings = await readSettings();
  return resolveAsaasConfiguration({
    environment: settings.environment,
    apiKey: settings.environment === "sandbox" ? settings.sandboxApiKey : settings.productionApiKey,
    webhookAuthToken: settings.environment === "sandbox"
      ? settings.webhook.sandboxAuthToken
      : settings.webhook.productionAuthToken,
    productionEnabled: settings.productionEnabled,
    runtimeEnvironment: process.env.NODE_ENV,
  });
}

export async function getAsaasSetupStatus() {
  const settings = await readSettings();
  try {
    const configuration = resolveAsaasConfiguration({
      environment: settings.environment,
      apiKey: settings.environment === "sandbox" ? settings.sandboxApiKey : settings.productionApiKey,
      webhookAuthToken: settings.environment === "sandbox"
        ? settings.webhook.sandboxAuthToken
        : settings.webhook.productionAuthToken,
      productionEnabled: settings.productionEnabled,
      runtimeEnvironment: process.env.NODE_ENV,
    });
    return {
      environment: configuration.environment,
      baseUrl: configuration.baseUrl,
      configured: configuration.configured,
      productionEnabled: settings.productionEnabled,
      errorCode: null,
    };
  } catch {
    const environment = settings.environment === "production" ? "production" : "sandbox";
    return {
      environment,
      baseUrl: getAsaasBaseUrl(environment),
      configured: false,
      productionEnabled: settings.productionEnabled,
      errorCode: "INVALID_CONFIGURATION",
    };
  }
}

export async function getAsaasWebhookRegistrationSettings() {
  const settings = await readSettings();
  const environment = settings.environment;
  return {
    environment,
    apiKey: environment === "sandbox" ? settings.sandboxApiKey : settings.productionApiKey,
    webhookId: environment === "sandbox" ? settings.webhook.sandboxId : settings.webhook.productionId,
    authToken: environment === "sandbox"
      ? settings.webhook.sandboxAuthToken
      : settings.webhook.productionAuthToken,
    name: settings.webhook.name,
    url: settings.webhook.url,
    email: settings.webhook.email,
    enabled: settings.webhook.enabled,
    interrupted: settings.webhook.interrupted,
    apiVersion: settings.webhook.apiVersion,
    sendType: settings.webhook.sendType,
    events: settings.webhook.events,
    productionEnabled: settings.productionEnabled,
  };
}

export async function verifyAndGetWebhookAuthToken() {
  try {
    const settings = await readSettings();
    const token = settings.environment === "sandbox"
      ? settings.webhook.sandboxAuthToken
      : settings.webhook.productionAuthToken;
    const apiKey = settings.environment === "sandbox" ? settings.sandboxApiKey : settings.productionApiKey;
    if (!token || token.length < 32 || token.length > 255 || /\s/.test(token) || token === apiKey) return null;
    return token;
  } catch {
    return null;
  }
}

export async function persistAsaasWebhookId(input: {
  environment: AsaasEnvironment;
  webhookId: string;
  updatedById: string;
}) {
  const key = input.environment === "sandbox" ? KEYS.sandboxWebhookId : KEYS.productionWebhookId;
  const definition = await prisma.configurationDefinition.findUnique({ where: { key }, select: { id: true } });
  if (!definition) throw new Error("Configuração do identificador de webhook indisponível.");

  return prisma.configurationValue.upsert({
    where: { definitionId_scopeKey: { definitionId: definition.id, scopeKey: "GLOBAL" } },
    create: {
      definitionId: definition.id,
      scope: ConfigurationScope.GLOBAL,
      scopeKey: "GLOBAL",
      value: input.webhookId as Prisma.InputJsonValue,
      updatedById: input.updatedById,
    },
    update: {
      value: input.webhookId as Prisma.InputJsonValue,
      updatedById: input.updatedById,
    },
  });
}

export async function getAsaasSettingsForAdmin() {
  const settings = await readSettings();
  const storedApiKeys = await prisma.configurationValue.findMany({
    where: {
      scope: ConfigurationScope.GLOBAL,
      scopeKey: "GLOBAL",
      definition: { key: { in: [KEYS.sandboxApiKey, KEYS.productionApiKey] } },
    },
    select: {
      definition: { select: { key: true } },
      value: true,
    },
  });
  const configuredApiKeys = new Set(storedApiKeys
    .filter(({ value }) => typeof value === "string" && value.length > 0)
    .map(({ definition }) => definition.key));

  return {
    environment: settings.environment,
    productionEnabled: settings.productionEnabled,
    credentials: {
      sandboxApiKeyConfigured: configuredApiKeys.has(KEYS.sandboxApiKey),
      productionApiKeyConfigured: configuredApiKeys.has(KEYS.productionApiKey),
    },
    webhook: {
      name: settings.webhook.name,
      url: settings.webhook.url,
      email: settings.webhook.email,
      enabled: settings.webhook.enabled,
      interrupted: settings.webhook.interrupted,
      apiVersion: settings.webhook.apiVersion,
      sendType: settings.webhook.sendType,
      events: settings.webhook.events,
      id: settings.environment === "sandbox" ? settings.webhook.sandboxId : settings.webhook.productionId,
      authTokenConfigured: Boolean(settings.environment === "sandbox"
        ? settings.webhook.sandboxAuthToken
        : settings.webhook.productionAuthToken),
    },
  };
}

export const ASAAS_CONFIGURATION_PREFIX = "business.billing.asaas.";
export const ASAAS_CONFIGURATION_KEYS = KEYS;
