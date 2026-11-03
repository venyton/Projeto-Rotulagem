import "server-only";

import type { SanitizedAsaasWebhookEvent } from "@/features/billing/domain/webhook";
import { verifyAsaasWebhookAuthToken } from "@/features/billing/domain/webhook";
import { verifyAndGetWebhookAuthToken } from "@/features/billing/integrations/asaas/asaas-settings";
import { createAsaasBillingProvider } from "@/features/billing/integrations/asaas/asaas-provider";
import {
  ingestAsaasWebhookWithClient,
  processBillingWebhookEventWithClient,
  processPendingBillingWebhooksWithClient,
  reconcileCheckoutAttemptWithClient,
} from "@/features/billing/persistence/webhook-core";
import { prisma } from "@/lib/prisma";
import { ROLLOUT_FLAGS } from "@/features/rollout/domain/feature-flags";
import { requireRolloutFeature } from "@/features/rollout/services/feature-flags";

export async function verifyAsaasWebhookRequest(receivedToken: string | null) {
  const expected = await verifyAndGetWebhookAuthToken();
  return {
    configured: Boolean(expected),
    authenticated: verifyAsaasWebhookAuthToken(receivedToken, expected),
  };
}

export function ingestAsaasWebhook(event: SanitizedAsaasWebhookEvent, payloadHash: string) {
  return ingestAsaasWebhookWithClient(prisma, event, payloadHash);
}

export function processBillingWebhookEvent(eventId: string) {
  return processBillingWebhookEventWithClient(prisma, eventId);
}

export function processPendingBillingWebhooks(limit?: number) {
  return processPendingBillingWebhooksWithClient(prisma, limit);
}

export async function reconcileCheckoutAttempt(input: {
  organizationId: string;
  attemptId: string;
  actorUserId?: string;
}) {
  await requireRolloutFeature(ROLLOUT_FLAGS.BILLING_ASAAS);
  const provider = await createAsaasBillingProvider();
  return reconcileCheckoutAttemptWithClient(prisma, provider, input);
}
