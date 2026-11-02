import {
  BillingProviderError,
  type BillingProvider,
  type BillingProviderCheckout,
  type BillingProviderCustomer,
  type BillingProviderCustomerInput,
  type BillingProviderDiagnostic,
  type BillingProviderPaymentSnapshot,
  type BillingProviderRecurringCheckoutInput,
} from "../../domain/billing-provider";
import type { AsaasConfiguration } from "./config";
import { readBoundedJsonResponse } from "../../../../lib/security/request-body";

type FetchImplementation = typeof fetch;

export type AsaasWebhookConfiguration = {
  name: string;
  url: string;
  email: string;
  enabled: boolean;
  interrupted: boolean;
  apiVersion: number;
  authToken: string;
  sendType: "SEQUENTIALLY" | "NON_SEQUENTIALLY";
  events: string[];
};

export type AsaasWebhookRecord = {
  id: string;
  name: string;
  url: string;
};

const REQUEST_TIMEOUT_MS = 10_000;
const RESPONSE_BODY_LIMIT_BYTES = 1024 * 1024;
const CHECKOUT_ITEM_IMAGE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
const CHECKOUT_STATUSES = new Set(["ACTIVE", "CANCELED", "EXPIRED", "PAID"]);
const PAYMENT_STATUSES = new Set([
  "PENDING",
  "RECEIVED",
  "CONFIRMED",
  "OVERDUE",
  "REFUNDED",
  "REFUND_REQUESTED",
  "CHARGEBACK_REQUESTED",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedString(value: unknown, maximum = 200) {
  return typeof value === "string" && value.length > 0 && value.length <= maximum ? value : null;
}

function parseProviderCode(body: unknown) {
  if (!isRecord(body) || !Array.isArray(body.errors) || !isRecord(body.errors[0])) return null;
  const code = boundedString(body.errors[0].code, 100);
  return code && /^[a-zA-Z0-9_.-]+$/.test(code) ? code : null;
}

function parseCustomer(body: unknown, fallbackExternalReference: string | null = null): BillingProviderCustomer {
  if (!isRecord(body)) throw new BillingProviderError("INVALID_RESPONSE");
  const id = boundedString(body.id, 191);
  const name = boundedString(body.name, 200);
  if (!id || !name) throw new BillingProviderError("INVALID_RESPONSE");
  return {
    id,
    name,
    externalReference: boundedString(body.externalReference, 200) ?? fallbackExternalReference,
    email: boundedString(body.email, 254),
    deleted: body.deleted === true,
  };
}

function parseCheckoutLink(value: unknown, environment: AsaasConfiguration["environment"]) {
  const raw = boundedString(value, 2_048);
  if (!raw) throw new BillingProviderError("INVALID_RESPONSE");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BillingProviderError("INVALID_RESPONSE");
  }
  const expectedHost = environment === "sandbox" ? "sandbox.asaas.com" : "asaas.com";
  if (url.protocol !== "https:" || url.hostname !== expectedHost || !url.pathname.startsWith("/checkoutSession/")) {
    throw new BillingProviderError("INVALID_RESPONSE");
  }
  return url.toString();
}

function parseCheckout(
  body: unknown,
  environment: AsaasConfiguration["environment"],
  fallbackExternalReference: string,
): BillingProviderCheckout {
  if (!isRecord(body)) throw new BillingProviderError("INVALID_RESPONSE");
  const id = boundedString(body.id, 191);
  const status = boundedString(body.status, 32);
  const externalReference = boundedString(body.externalReference, 200) ?? fallbackExternalReference;
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id) || !status || !CHECKOUT_STATUSES.has(status)) {
    throw new BillingProviderError("INVALID_RESPONSE");
  }
  return {
    id,
    link: parseCheckoutLink(body.link, environment),
    status: status as BillingProviderCheckout["status"],
    externalReference,
  };
}

function parseRateLimitReset(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function parseWebhookRecord(value: unknown): AsaasWebhookRecord {
  if (!isRecord(value)) throw new BillingProviderError("INVALID_RESPONSE");
  const id = boundedString(value.id, 191);
  const name = boundedString(value.name, 100);
  const url = boundedString(value.url, 2_048);
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id) || !name || !url) {
    throw new BillingProviderError("INVALID_RESPONSE");
  }
  return { id, name, url };
}

function webhookIdFromResponse(value: unknown) {
  if (!isRecord(value)) throw new BillingProviderError("INVALID_RESPONSE");
  const id = boundedString(value.id, 191);
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) throw new BillingProviderError("INVALID_RESPONSE");
  return id;
}

function parsePaymentSnapshot(body: unknown, fallbackCheckoutId: string): BillingProviderPaymentSnapshot {
  if (!isRecord(body)) throw new BillingProviderError("INVALID_RESPONSE");
  const id = boundedString(body.id, 191);
  const status = boundedString(body.status, 40);
  const checkoutId = boundedString(body.checkoutSession, 191) ?? fallbackCheckoutId;
  const subscriptionId = boundedString(body.subscription, 191);
  const value = typeof body.value === "number" && Number.isFinite(body.value) ? body.value : null;
  const amountMinor = value === null ? null : Math.round(value * 100);
  if (
    !id
    || !/^[A-Za-z0-9_-]+$/.test(id)
    || !status
    || !PAYMENT_STATUSES.has(status)
    || !checkoutId
    || amountMinor === null
    || !Number.isSafeInteger(amountMinor)
    || amountMinor <= 0
    || Math.abs(value! * 100 - amountMinor) > 1e-7
  ) {
    throw new BillingProviderError("INVALID_RESPONSE");
  }
  return {
    id,
    status,
    subscriptionId,
    checkoutId,
    amountMinor,
    dueDate: boundedString(body.dueDate, 40),
    paymentDate: boundedString(body.paymentDate, 40),
    confirmedDate: boundedString(body.confirmedDate, 40),
  };
}

function mapHttpError(status: number) {
  if (status === 400) return "VALIDATION_ERROR" as const;
  if (status === 401) return "UNAUTHORIZED" as const;
  if (status === 403) return "FORBIDDEN" as const;
  if (status === 404) return "NOT_FOUND" as const;
  if (status === 429) return "RATE_LIMITED" as const;
  return "PROVIDER_UNAVAILABLE" as const;
}

export class AsaasHttpClient implements BillingProvider {
  readonly name = "ASAAS" as const;

  constructor(
    private readonly configuration: AsaasConfiguration,
    private readonly fetchImplementation: FetchImplementation = fetch,
  ) {}

  async diagnostic(): Promise<BillingProviderDiagnostic> {
    const baseline = {
      provider: "ASAAS" as const,
      environment: this.configuration.environment,
      configured: this.configuration.configured,
      baseHost: this.configuration.baseHost,
    };
    if (!this.configuration.configured) {
      return { ...baseline, status: "not_configured", latencyMs: null, errorCode: "NOT_CONFIGURED" };
    }

    const startedAt = Date.now();
    try {
      await this.request("/customers?limit=1&offset=0", { method: "GET" });
      return {
        ...baseline,
        status: "reachable",
        latencyMs: Date.now() - startedAt,
        errorCode: null,
      };
    } catch (error) {
      return {
        ...baseline,
        status: "unreachable",
        latencyMs: Date.now() - startedAt,
        errorCode: error instanceof BillingProviderError ? error.code : "NETWORK_ERROR",
      };
    }
  }

  async findCustomerByExternalReference(externalReference: string) {
    const normalized = externalReference.trim();
    if (!normalized || normalized.length > 200) throw new BillingProviderError("VALIDATION_ERROR");
    const query = new URLSearchParams({ externalReference: normalized, limit: "2", offset: "0" });
    const response = await this.request(`/customers?${query.toString()}`, { method: "GET" });
    if (!isRecord(response) || !Array.isArray(response.data)) {
      throw new BillingProviderError("INVALID_RESPONSE");
    }
    const customers = response.data
      .map((item) => parseCustomer(item))
      .filter((customer) => customer.externalReference === normalized && !customer.deleted);
    if (customers.length > 1) throw new BillingProviderError("DUPLICATE_REMOTE_MAPPING");
    return customers[0] ?? null;
  }

  createCustomer(input: BillingProviderCustomerInput) {
    return this.request("/customers", {
      method: "POST",
      body: {
        name: input.name,
        cpfCnpj: input.cpfCnpj,
        externalReference: input.externalReference,
        ...(input.email ? { email: input.email } : {}),
        ...(input.mobilePhone ? { mobilePhone: input.mobilePhone } : {}),
        ...(input.notificationDisabled === undefined
          ? {}
          : { notificationDisabled: input.notificationDisabled }),
      },
    }).then((body) => parseCustomer(body, input.externalReference));
  }

  retrieveCustomer(providerCustomerId: string) {
    const id = this.customerId(providerCustomerId);
    return this.request(`/customers/${encodeURIComponent(id)}`, { method: "GET" })
      .then((body) => parseCustomer(body));
  }

  createRecurringCheckout(input: BillingProviderRecurringCheckoutInput) {
    const amount = input.item.amountMinor / 100;
    if (!Number.isSafeInteger(input.item.amountMinor) || input.item.amountMinor <= 0 || input.item.currency !== "BRL") {
      throw new BillingProviderError("VALIDATION_ERROR");
    }
    return this.request("/checkouts", {
      method: "POST",
      body: {
        billingTypes: ["CREDIT_CARD"],
        chargeTypes: ["RECURRENT"],
        minutesToExpire: input.expiresInMinutes,
        externalReference: input.externalReference,
        callback: input.callback,
        items: [{
          externalReference: input.item.externalReference,
          name: input.item.name,
          description: input.item.description,
          imageBase64: CHECKOUT_ITEM_IMAGE_BASE64,
          quantity: input.item.quantity,
          value: amount,
        }],
        // O guia oficial documenta `customer`; o OpenAPI atual o omite. O
        // detalhe permanece isolado aqui até o teste Sandbox resolver RISK-010.
        customer: input.customerId,
        subscription: input.subscription,
      },
    }).then((body) => parseCheckout(body, this.configuration.environment, input.externalReference));
  }

  cancelCheckout(providerCheckoutId: string) {
    const id = this.checkoutId(providerCheckoutId);
    return this.request(`/checkouts/${encodeURIComponent(id)}/cancel`, { method: "POST" })
      .then((body) => parseCheckout(body, this.configuration.environment, ""));
  }

  async listPaymentsByCheckout(providerCheckoutId: string) {
    const checkoutId = this.checkoutId(providerCheckoutId);
    const query = new URLSearchParams({ checkoutSession: checkoutId, limit: "100", offset: "0" });
    const body = await this.request(`/payments?${query.toString()}`, { method: "GET" });
    if (!isRecord(body) || !Array.isArray(body.data) || body.hasMore === true) {
      throw new BillingProviderError("INVALID_RESPONSE");
    }
    return body.data.map((payment) => parsePaymentSnapshot(payment, checkoutId));
  }

  async removeCustomer(providerCustomerId: string) {
    const id = this.customerId(providerCustomerId);
    const body = await this.request(`/customers/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!isRecord(body) || body.deleted !== true || body.id !== id) {
      throw new BillingProviderError("INVALID_RESPONSE");
    }
    return { id, deleted: true as const };
  }

  async listWebhooks() {
    const body = await this.request("/webhooks?offset=0&limit=100", { method: "GET" });
    if (!isRecord(body) || !Array.isArray(body.data) || body.hasMore === true) {
      throw new BillingProviderError("INVALID_RESPONSE");
    }
    return body.data.map(parseWebhookRecord);
  }

  async createWebhook(configuration: AsaasWebhookConfiguration) {
    const body = await this.request("/webhooks", {
      method: "POST",
      body: {
        name: configuration.name,
        url: configuration.url,
        email: configuration.email,
        enabled: configuration.enabled,
        interrupted: configuration.interrupted,
        apiVersion: configuration.apiVersion,
        authToken: configuration.authToken,
        sendType: configuration.sendType,
        events: configuration.events,
      },
    });
    return { id: webhookIdFromResponse(body), name: configuration.name, url: configuration.url };
  }

  async updateWebhook(webhookId: string, configuration: AsaasWebhookConfiguration) {
    const id = this.webhookId(webhookId);
    const body = await this.request(`/webhooks/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: {
        name: configuration.name,
        url: configuration.url,
        enabled: configuration.enabled,
        interrupted: configuration.interrupted,
        authToken: configuration.authToken,
        sendType: configuration.sendType,
        events: configuration.events,
      },
    });
    if (isRecord(body) && body.id !== undefined && webhookIdFromResponse(body) !== id) {
      throw new BillingProviderError("INVALID_RESPONSE");
    }
    return { id, name: configuration.name, url: configuration.url };
  }

  private customerId(value: string) {
    const id = value.trim();
    if (!/^cus_[A-Za-z0-9]+$/.test(id) || id.length > 191) {
      throw new BillingProviderError("VALIDATION_ERROR");
    }
    return id;
  }

  private checkoutId(value: string) {
    const id = value.trim();
    if (!/^[A-Za-z0-9_-]+$/.test(id) || id.length < 8 || id.length > 191) {
      throw new BillingProviderError("VALIDATION_ERROR");
    }
    return id;
  }

  private webhookId(value: string) {
    const id = value.trim();
    if (!/^[A-Za-z0-9_-]+$/.test(id) || id.length > 191) {
      throw new BillingProviderError("VALIDATION_ERROR");
    }
    return id;
  }

  private async request(
    path: string,
    options: { method: "GET" | "POST" | "PUT" | "DELETE"; body?: Record<string, unknown> },
  ) {
    if (!this.configuration.apiKey) throw new BillingProviderError("NOT_CONFIGURED");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await this.fetchImplementation(`${this.configuration.baseUrl}${path}`, {
        method: options.method,
        redirect: "error",
        headers: {
          Accept: "application/json",
          "User-Agent": `SoIZI/0.1.1 (Node.js; ${this.configuration.environment})`,
          access_token: this.configuration.apiKey,
          ...(options.body ? { "Content-Type": "application/json" } : {}),
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
        signal: controller.signal,
      });
    } catch (cause) {
      throw new BillingProviderError("NETWORK_ERROR", {
        retryable: options.method === "GET",
        outcomeUnknown: options.method !== "GET",
        cause,
      });
    } finally {
      clearTimeout(timeout);
    }

    const contentType = response.headers.get("content-type") ?? "";
    let body: unknown = null;
    if (contentType.includes("application/json")) {
      const parsed = await readBoundedJsonResponse(response, RESPONSE_BODY_LIMIT_BYTES);
      if (parsed.ok) body = parsed.value;
      else if (response.ok) throw new BillingProviderError("INVALID_RESPONSE", { status: response.status });
    }

    if (!response.ok) {
      const code = mapHttpError(response.status);
      throw new BillingProviderError(code, {
        status: response.status,
        providerCode: parseProviderCode(body) ?? undefined,
        retryable: response.status === 429 || response.status >= 500,
        outcomeUnknown: options.method !== "GET" && response.status >= 500,
        rateLimitResetSeconds: parseRateLimitReset(response.headers.get("ratelimit-reset")) ?? undefined,
      });
    }
    if (!contentType.includes("application/json")) {
      throw new BillingProviderError("INVALID_RESPONSE", { status: response.status });
    }
    return body;
  }
}
