import { after, NextResponse } from "next/server";

import {
  BillingWebhookInputError,
  parseAndSanitizeAsaasWebhook,
  webhookPayloadHash,
} from "@/features/billing/domain/webhook";
import {
  ingestAsaasWebhook,
  processBillingWebhookEvent,
  verifyAsaasWebhookRequest,
} from "@/features/billing/services/webhooks";
import { ROLLOUT_FLAGS } from "@/features/rollout/domain/feature-flags";
import { isRolloutFeatureEnabled } from "@/features/rollout/services/feature-flags";
import { readBoundedTextBody } from "@/lib/security/request-body";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const responseHeaders = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const authentication = await verifyAsaasWebhookRequest(request.headers.get("asaas-access-token"));
  if (!authentication.configured) {
    return NextResponse.json({ received: false }, { status: 503, headers: responseHeaders });
  }
  if (!authentication.authenticated) {
    return NextResponse.json({ received: false }, { status: 401, headers: responseHeaders });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ received: false }, { status: 415, headers: responseHeaders });
  }
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > 256 * 1024) {
    return NextResponse.json({ received: false }, { status: 413, headers: responseHeaders });
  }

  try {
    const body = await readBoundedTextBody(
      request.body,
      request.headers.get("content-length"),
      256 * 1024,
    );
    if (!body.ok) {
      const status = body.error === "TOO_LARGE" ? 413 : 400;
      return NextResponse.json({ received: false }, { status, headers: responseHeaders });
    }
    const rawBody = body.text;
    const event = parseAndSanitizeAsaasWebhook(rawBody);
    const inbox = await ingestAsaasWebhook(event, webhookPayloadHash(rawBody));
    if (await isRolloutFeatureEnabled(ROLLOUT_FLAGS.BILLING_WEBHOOK_PROCESSING)) {
      after(async () => {
        try {
          await processBillingWebhookEvent(inbox.eventId);
        } catch {
          // O estado sanitizado FAILED fica persistido para replay/reconciliação.
        }
      });
    }
    return NextResponse.json(
      { received: true, duplicate: inbox.duplicate },
      { status: 200, headers: responseHeaders },
    );
  } catch (error) {
    if (error instanceof BillingWebhookInputError) {
      const status = error.code === "PAYLOAD_TOO_LARGE" ? 413 : 400;
      return NextResponse.json({ received: false }, { status, headers: responseHeaders });
    }
    return NextResponse.json({ received: false }, { status: 500, headers: responseHeaders });
  }
}
