import assert from "node:assert/strict";
import test from "node:test";

import {
  BillingWebhookInputError,
  billingMinorFromProviderValue,
  parseAndSanitizeAsaasWebhook,
  verifyAsaasWebhookAuthToken,
} from "./webhook";

const token = "stage7-webhook-token-with-at-least-32-characters";

test("compara o auth token sem comparação variável e nega ausência", () => {
  assert.equal(verifyAsaasWebhookAuthToken(token, token), true);
  assert.equal(verifyAsaasWebhookAuthToken(`${token}x`, token), false);
  assert.equal(verifyAsaasWebhookAuthToken(null, token), false);
});

test("projeta apenas campos financeiros necessários e ignora propriedades futuras", () => {
  const event = parseAndSanitizeAsaasWebhook(JSON.stringify({
    id: "evt_stage7&1",
    event: "PAYMENT_CONFIRMED",
    dateCreated: "2026-08-27 12:00:00",
    futureTopLevel: { secret: "não persistir" },
    payment: {
      id: "pay_stage7",
      status: "CONFIRMED",
      subscription: "sub_stage7",
      checkoutSession: "checkout_stage7",
      value: 129.9,
      customer: "PII descartada",
      creditCard: { number: "não persistir" },
      futureField: true,
    },
  }));
  assert.deepEqual(event, {
    id: "evt_stage7&1",
    event: "PAYMENT_CONFIRMED",
    dateCreated: "2026-08-27 12:00:00",
    payment: {
      id: "pay_stage7",
      status: "CONFIRMED",
      subscription: "sub_stage7",
      checkoutSession: "checkout_stage7",
      externalReference: null,
      value: 129.9,
      dueDate: null,
      paymentDate: null,
      confirmedDate: null,
    },
  });
});

test("rejeita evento conhecido sem recurso e valor monetário não exato", () => {
  assert.throws(
    () => parseAndSanitizeAsaasWebhook('{"id":"evt_x","event":"PAYMENT_RECEIVED"}'),
    (error) => error instanceof BillingWebhookInputError && error.code === "INVALID_RESOURCE",
  );
  assert.equal(billingMinorFromProviderValue(129.9), 12_990);
  assert.throws(
    () => billingMinorFromProviderValue(1.001),
    (error) => error instanceof BillingWebhookInputError,
  );
});

test("evento desconhecido válido é aceito para descarte idempotente", () => {
  assert.deepEqual(
    parseAndSanitizeAsaasWebhook('{"id":"evt_future_1","event":"FUTURE_EVENT","new":true}'),
    { id: "evt_future_1", event: "FUTURE_EVENT", dateCreated: null },
  );
});
