import { createHash, timingSafeEqual } from "node:crypto";

export const SUPPORTED_ASAAS_WEBHOOK_EVENTS = new Set([
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
]);

export type SanitizedAsaasWebhookEvent = {
  id: string;
  event: string;
  dateCreated: string | null;
  checkout?: {
    id: string;
    status: string | null;
    customer: string | null;
  };
  subscription?: {
    id: string;
    status: string | null;
    externalReference: string | null;
    customer: string | null;
    value: number | null;
    nextDueDate: string | null;
  };
  payment?: {
    id: string;
    status: string | null;
    subscription: string | null;
    checkoutSession: string | null;
    externalReference: string | null;
    value: number | null;
    dueDate: string | null;
    paymentDate: string | null;
    confirmedDate: string | null;
  };
};

export class BillingWebhookInputError extends Error {
  constructor(public code: "INVALID_JSON" | "INVALID_EVENT" | "INVALID_RESOURCE" | "PAYLOAD_TOO_LARGE") {
    super(`Webhook inválido: ${code}.`);
    this.name = "BillingWebhookInputError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedString(value: unknown, maximum = 191) {
  return typeof value === "string" && value.length > 0 && value.length <= maximum ? value : null;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function resourceId(value: unknown) {
  const result = boundedString(value);
  return result && /^[A-Za-z0-9_&.-]+$/.test(result) ? result : null;
}

export function webhookPayloadHash(rawBody: string) {
  return createHash("sha256").update(rawBody).digest("hex");
}

export function verifyAsaasWebhookAuthToken(received: string | null, expected: string | null) {
  if (!received || !expected || received.length > 255 || expected.length < 32) return false;
  const actualHash = createHash("sha256").update(received).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actualHash, expectedHash);
}

export function parseAndSanitizeAsaasWebhook(rawBody: string): SanitizedAsaasWebhookEvent {
  if (Buffer.byteLength(rawBody, "utf8") > 256 * 1024) {
    throw new BillingWebhookInputError("PAYLOAD_TOO_LARGE");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new BillingWebhookInputError("INVALID_JSON");
  }
  if (!isRecord(parsed)) throw new BillingWebhookInputError("INVALID_EVENT");
  const id = resourceId(parsed.id);
  const event = boundedString(parsed.event, 100);
  if (!id || !id.startsWith("evt_") || !event || !/^[A-Z0-9_]+$/.test(event)) {
    throw new BillingWebhookInputError("INVALID_EVENT");
  }

  const result: SanitizedAsaasWebhookEvent = {
    id,
    event,
    dateCreated: boundedString(parsed.dateCreated, 40),
  };
  if (isRecord(parsed.checkout)) {
    const checkoutId = resourceId(parsed.checkout.id);
    if (checkoutId) {
      result.checkout = {
        id: checkoutId,
        status: boundedString(parsed.checkout.status, 40),
        customer: resourceId(parsed.checkout.customer),
      };
    }
  }
  if (isRecord(parsed.subscription)) {
    const subscriptionId = resourceId(parsed.subscription.id);
    if (subscriptionId) {
      result.subscription = {
        id: subscriptionId,
        status: boundedString(parsed.subscription.status, 40),
        externalReference: boundedString(parsed.subscription.externalReference, 200),
        customer: resourceId(parsed.subscription.customer),
        value: optionalNumber(parsed.subscription.value),
        nextDueDate: boundedString(parsed.subscription.nextDueDate, 40),
      };
    }
  }
  if (isRecord(parsed.payment)) {
    const paymentId = resourceId(parsed.payment.id);
    if (paymentId) {
      result.payment = {
        id: paymentId,
        status: boundedString(parsed.payment.status, 40),
        subscription: resourceId(parsed.payment.subscription),
        checkoutSession: resourceId(parsed.payment.checkoutSession),
        externalReference: boundedString(parsed.payment.externalReference, 200),
        value: optionalNumber(parsed.payment.value),
        dueDate: boundedString(parsed.payment.dueDate, 40),
        paymentDate: boundedString(parsed.payment.paymentDate, 40),
        confirmedDate: boundedString(parsed.payment.confirmedDate, 40),
      };
    }
  }

  if (
    (event.startsWith("CHECKOUT_") && !result.checkout)
    || (event.startsWith("SUBSCRIPTION_") && !result.subscription)
    || (event.startsWith("PAYMENT_") && !result.payment)
  ) {
    throw new BillingWebhookInputError("INVALID_RESOURCE");
  }
  return result;
}

export function billingMinorFromProviderValue(value: number | null) {
  if (value === null || value <= 0) throw new BillingWebhookInputError("INVALID_RESOURCE");
  const scaled = value * 100;
  const rounded = Math.round(scaled);
  if (!Number.isSafeInteger(rounded) || Math.abs(scaled - rounded) > 1e-7) {
    throw new BillingWebhookInputError("INVALID_RESOURCE");
  }
  return rounded;
}
