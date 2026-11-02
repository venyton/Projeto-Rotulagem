import assert from "node:assert/strict";
import test from "node:test";

import {
  BillingCheckoutInputError,
  checkoutReturnCopy,
  mapBillingIntervalToAsaasCycle,
  validateCheckoutOffer,
} from "./checkout";

test("mapeia intervalos internos sem vazar nomes de plano", () => {
  assert.equal(mapBillingIntervalToAsaasCycle("MONTHLY"), "MONTHLY");
  assert.equal(mapBillingIntervalToAsaasCycle("QUARTERLY"), "QUARTERLY");
  assert.equal(mapBillingIntervalToAsaasCycle("SEMIANNUAL"), "SEMIANNUALLY");
  assert.equal(mapBillingIntervalToAsaasCycle("YEARLY"), "YEARLY");
});

test("valida preço, referência, expiração e callbacks antes do provider", () => {
  assert.deepEqual(validateCheckoutOffer({
    amountMinor: 12_990,
    currency: "BRL",
    expiresInMinutes: 30,
    externalReference: "checkout_internal_1",
    name: "Plano Profissional 2026",
    callbackUrls: [
      "https://app.example.test/dashboard/billing/checkout/1/success?state=opaque",
      "https://app.example.test/dashboard/billing/checkout/1/cancel?state=opaque",
    ],
  }), { externalReference: "checkout_internal_1", name: "Plano Profissional 2026" });
  assert.throws(
    () => validateCheckoutOffer({
      amountMinor: 10,
      currency: "USD",
      expiresInMinutes: 5,
      externalReference: "x",
      name: "A",
      callbackUrls: ["javascript:alert(1)"],
    }),
    (error) => error instanceof BillingCheckoutInputError,
  );
});

test("callback de sucesso permanece explicitamente não autoritativo", () => {
  assert.match(checkoutReturnCopy("success").description, /só será atualizado após a confirmação financeira/);
  assert.match(checkoutReturnCopy("cancel").description, /Nenhuma confirmação financeira/);
});
