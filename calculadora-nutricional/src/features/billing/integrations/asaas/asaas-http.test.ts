import assert from "node:assert/strict";
import test from "node:test";

import { BillingProviderError } from "../../domain/billing-provider";
import { AsaasHttpClient } from "./asaas-http";
import { resolveAsaasConfiguration } from "./config";

const configuration = resolveAsaasConfiguration({
  runtimeEnvironment: "test",
  environment: "sandbox",
  apiKey: "$aact_hmlg_contract_test",
});

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...init.headers },
  });
}

test("busca customer por externalReference com GET sem body e headers oficiais", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const client = new AsaasHttpClient(configuration, (async (url, init) => {
    capturedUrl = String(url);
    capturedInit = init;
    return json({
      data: [{ id: "cus_123", name: "Cliente", externalReference: "org_1", deleted: false }],
      hasMore: false,
      totalCount: 1,
    });
  }) as typeof fetch);

  const customer = await client.findCustomerByExternalReference("org_1");
  assert.equal(customer?.id, "cus_123");
  assert.match(capturedUrl, /^https:\/\/api-sandbox\.asaas\.com\/v3\/customers\?/);
  assert.match(capturedUrl, /externalReference=org_1/);
  assert.equal(capturedInit?.method, "GET");
  assert.equal(capturedInit?.body, undefined);
  const headers = capturedInit?.headers as Record<string, string>;
  assert.equal(headers.access_token, "$aact_hmlg_contract_test");
  assert.match(headers["User-Agent"], /^SoIZI\/0\.1\.1/);
});

test("cria customer com payload mínimo e referência interna", async () => {
  let payload: Record<string, unknown> = {};
  const client = new AsaasHttpClient(configuration, (async (_url, init) => {
    payload = JSON.parse(String(init?.body));
    return json({ id: "cus_456", name: "Cliente Teste", externalReference: "org_2", deleted: false });
  }) as typeof fetch);
  const result = await client.createCustomer({
    externalReference: "org_2",
    name: "Cliente Teste",
    cpfCnpj: "52998224725",
    email: "financeiro@example.test",
  });
  assert.equal(result.id, "cus_456");
  assert.deepEqual(payload, {
    name: "Cliente Teste",
    cpfCnpj: "52998224725",
    externalReference: "org_2",
    email: "financeiro@example.test",
  });
});

test("não expõe descrição remota e classifica rate limit sem retry automático", async () => {
  let calls = 0;
  const client = new AsaasHttpClient(configuration, (async () => {
    calls += 1;
    return json({ errors: [{ code: "rate_limit", description: "conteúdo remoto sensível" }] }, {
      status: 429,
      headers: { "ratelimit-reset": "30" },
    });
  }) as typeof fetch);
  await assert.rejects(
    () => client.findCustomerByExternalReference("org_3"),
    (error) => error instanceof BillingProviderError
      && error.code === "RATE_LIMITED"
      && error.providerCode === "rate_limit"
      && error.rateLimitResetSeconds === 30
      && error.retryable,
  );
  assert.equal(calls, 1);
});

test("marca POST com falha de rede como resultado ambíguo e não repete", async () => {
  let calls = 0;
  const client = new AsaasHttpClient(configuration, (async () => {
    calls += 1;
    throw new Error("socket reset");
  }) as typeof fetch);
  await assert.rejects(
    () => client.createCustomer({
      externalReference: "org_4",
      name: "Cliente Teste",
      cpfCnpj: "52998224725",
    }),
    (error) => error instanceof BillingProviderError
      && error.code === "NETWORK_ERROR"
      && error.outcomeUnknown
      && !error.retryable,
  );
  assert.equal(calls, 1);
});

test("nega mapping remoto ambíguo quando a referência aparece duplicada", async () => {
  const client = new AsaasHttpClient(configuration, (async () => json({ data: [
    { id: "cus_1", name: "A", externalReference: "org_dup", deleted: false },
    { id: "cus_2", name: "B", externalReference: "org_dup", deleted: false },
  ] })) as typeof fetch);
  await assert.rejects(
    () => client.findCustomerByExternalReference("org_dup"),
    (error) => error instanceof BillingProviderError && error.code === "DUPLICATE_REMOTE_MAPPING",
  );
});

test("diagnóstico sem chave não chama rede nem revela segredo", async () => {
  let calls = 0;
  const client = new AsaasHttpClient(
    resolveAsaasConfiguration({ environment: "sandbox" }),
    (async () => {
      calls += 1;
      return json({});
    }) as typeof fetch,
  );
  assert.deepEqual(await client.diagnostic(), {
    provider: "ASAAS",
    environment: "sandbox",
    configured: false,
    status: "not_configured",
    baseHost: "api-sandbox.asaas.com",
    latencyMs: null,
    errorCode: "NOT_CONFIGURED",
  });
  assert.equal(calls, 0);
});

test("cria checkout recorrente hospedado com customer mapeado e payload oficial", async () => {
  let capturedUrl = "";
  let payload: Record<string, unknown> = {};
  const client = new AsaasHttpClient(configuration, (async (url, init) => {
    capturedUrl = String(url);
    payload = JSON.parse(String(init?.body));
    return json({
      id: "checkout_12345678",
      link: "https://sandbox.asaas.com/checkoutSession/show/checkout_12345678",
      status: "ACTIVE",
      externalReference: "attempt_1",
    });
  }) as typeof fetch);

  const checkout = await client.createRecurringCheckout({
    externalReference: "attempt_1",
    customerId: "cus_12345678",
    expiresInMinutes: 30,
    callback: {
      successUrl: "https://app.example.test/success",
      cancelUrl: "https://app.example.test/cancel",
      expiredUrl: "https://app.example.test/expired",
    },
    item: {
      externalReference: "price_1",
      name: "Plano Profissional",
      description: "Assinatura recorrente SoIZI",
      quantity: 1,
      amountMinor: 12_990,
      currency: "BRL",
    },
    subscription: { cycle: "MONTHLY", nextDueDate: "2026-08-27" },
  });

  assert.equal(capturedUrl, "https://api-sandbox.asaas.com/v3/checkouts");
  assert.equal(checkout.status, "ACTIVE");
  assert.deepEqual(payload.billingTypes, ["CREDIT_CARD"]);
  assert.deepEqual(payload.chargeTypes, ["RECURRENT"]);
  assert.equal(payload.customer, "cus_12345678");
  assert.equal((payload.subscription as Record<string, unknown>).cycle, "MONTHLY");
  assert.equal(((payload.items as Array<Record<string, unknown>>)[0]).value, 129.9);
  assert.equal(typeof ((payload.items as Array<Record<string, unknown>>)[0]).imageBase64, "string");
});

test("rejeita link de checkout fora do host oficial e não o expõe ao navegador", async () => {
  const client = new AsaasHttpClient(configuration, (async () => json({
    id: "checkout_12345678",
    link: "https://evil.example/checkoutSession/show/checkout_12345678",
    status: "ACTIVE",
    externalReference: "attempt_2",
  })) as typeof fetch);
  await assert.rejects(
    () => client.createRecurringCheckout({
      externalReference: "attempt_2",
      customerId: "cus_12345678",
      expiresInMinutes: 30,
      callback: {
        successUrl: "https://app.example.test/success",
        cancelUrl: "https://app.example.test/cancel",
        expiredUrl: "https://app.example.test/expired",
      },
      item: {
        externalReference: "price_2",
        name: "Plano Teste",
        description: "Assinatura recorrente SoIZI",
        quantity: 1,
        amountMinor: 1_000,
        currency: "BRL",
      },
      subscription: { cycle: "MONTHLY", nextDueDate: "2026-08-27" },
    }),
    (error) => error instanceof BillingProviderError && error.code === "INVALID_RESPONSE",
  );
});

test("cancelamento usa POST sem body no endpoint oficial", async () => {
  let capturedInit: RequestInit | undefined;
  const client = new AsaasHttpClient(configuration, (async (_url, init) => {
    capturedInit = init;
    return json({
      id: "checkout_12345678",
      link: "https://sandbox.asaas.com/checkoutSession/show/checkout_12345678",
      status: "CANCELED",
    });
  }) as typeof fetch);
  const checkout = await client.cancelCheckout("checkout_12345678");
  assert.equal(checkout.status, "CANCELED");
  assert.equal(capturedInit?.method, "POST");
  assert.equal(capturedInit?.body, undefined);
});

test("reconcilia cobranças do checkout com GET filtrado e sem body", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const client = new AsaasHttpClient(configuration, (async (url, init) => {
    capturedUrl = String(url);
    capturedInit = init;
    return json({
      data: [{
        id: "pay_stage7",
        status: "CONFIRMED",
        subscription: "sub_stage7",
        checkoutSession: "checkout_12345678",
        value: 129.9,
        dueDate: "2026-08-27",
      }],
      hasMore: false,
    });
  }) as typeof fetch);
  const payments = await client.listPaymentsByCheckout("checkout_12345678");
  assert.match(capturedUrl, /\/payments\?checkoutSession=checkout_12345678&limit=100&offset=0$/);
  assert.equal(capturedInit?.method, "GET");
  assert.equal(capturedInit?.body, undefined);
  assert.deepEqual(payments[0], {
    id: "pay_stage7",
    status: "CONFIRMED",
    subscriptionId: "sub_stage7",
    checkoutId: "checkout_12345678",
    amountMinor: 12_990,
    dueDate: "2026-08-27",
    paymentDate: null,
    confirmedDate: null,
  });
});
