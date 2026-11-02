import "server-only";

import { SUPPORTED_ASAAS_WEBHOOK_EVENTS } from "@/features/billing/domain/webhook";
import { BillingProviderError } from "@/features/billing/domain/billing-provider";
import { prisma } from "@/lib/prisma";
import { emailSchema } from "@/lib/validation/contacts";

import { createAsaasBillingProvider } from "./asaas-provider";
import {
  getAsaasWebhookRegistrationSettings,
  persistAsaasWebhookId,
} from "./asaas-settings";

function validatePublicWebhookUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new BillingProviderError("INVALID_CONFIGURATION");
  }
  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:"
    || url.username
    || url.password
    || url.search
    || url.hash
    || url.pathname !== "/api/webhooks/asaas"
    || !host.includes(".")
    || /^(localhost|.*\.(local|internal|test|invalid|example))$/.test(host)
    || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
    || host.includes(":")
  ) {
    throw new BillingProviderError("INVALID_CONFIGURATION");
  }
  return url.toString();
}

function webhookPayload(settings: Awaited<ReturnType<typeof getAsaasWebhookRegistrationSettings>>) {
  const email = emailSchema.safeParse(settings.email);
  if (
    !settings.apiKey
    || !settings.authToken
    || !email.success
    || settings.apiVersion !== 3
    || !["SEQUENTIALLY", "NON_SEQUENTIALLY"].includes(settings.sendType)
    || settings.events.length === 0
    || settings.events.length > SUPPORTED_ASAAS_WEBHOOK_EVENTS.size
    || settings.events.some((event) => !SUPPORTED_ASAAS_WEBHOOK_EVENTS.has(event))
    || new Set(settings.events).size !== settings.events.length
    || settings.authToken.length < 32
    || settings.authToken.length > 255
    || /\s/.test(settings.authToken)
    || settings.authToken === settings.apiKey
  ) {
    throw new BillingProviderError("INVALID_CONFIGURATION");
  }

  return {
    name: settings.name.trim(),
    url: validatePublicWebhookUrl(settings.url),
    email: email.data,
    enabled: settings.enabled,
    interrupted: settings.interrupted,
    apiVersion: settings.apiVersion,
    authToken: settings.authToken,
    sendType: settings.sendType as "SEQUENTIALLY" | "NON_SEQUENTIALLY",
    events: settings.events,
  };
}

export async function synchronizeAsaasWebhook(actorUserId: string, privilegedSessionId: string | null) {
  const settings = await getAsaasWebhookRegistrationSettings();
  const payload = webhookPayload(settings);
  const provider = await createAsaasBillingProvider();
  const webhooks = await provider.listWebhooks();

  let selectedId = settings.webhookId && webhooks.some((webhook) => webhook.id === settings.webhookId)
    ? settings.webhookId
    : null;

  if (!selectedId) {
    const sameUrl = webhooks.filter((webhook) => webhook.url === payload.url);
    const exactMatch = sameUrl.filter((webhook) => webhook.name === payload.name);
    if (exactMatch.length > 1 || (sameUrl.length > 0 && exactMatch.length === 0)) {
      throw new BillingProviderError("DUPLICATE_REMOTE_MAPPING");
    }
    selectedId = exactMatch[0]?.id ?? null;
  }

  const synced = selectedId
    ? await provider.updateWebhook(selectedId, payload)
    : await provider.createWebhook(payload);
  await persistAsaasWebhookId({
    environment: settings.environment,
    webhookId: synced.id,
    updatedById: actorUserId,
  });
  await prisma.securityAuditLog.create({
    data: {
      userId: actorUserId,
      privilegedSessionId,
      action: "platform.billing.asaas.webhook.synchronized",
      riskLevel: "HIGH",
      metadata: {
        environment: settings.environment,
        webhookId: synced.id,
        operation: selectedId ? "updated" : "created",
        eventCount: payload.events.length,
      },
    },
  });

  return { environment: settings.environment, webhookId: synced.id };
}
