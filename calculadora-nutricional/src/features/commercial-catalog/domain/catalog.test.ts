import assert from "node:assert/strict";
import test from "node:test";

import {
  assertPlanVersionPublishable,
  CatalogInvariantError,
  parseBrlAmountToMinor,
  requireStableCatalogKey,
  type PlanVersionPublicationInput,
} from "./catalog";

function validPublication(
  overrides: Partial<PlanVersionPublicationInput> = {},
): PlanVersionPublicationInput {
  return {
    status: "DRAFT",
    versionNumber: 1,
    isPaid: true,
    features: [
      {
        key: "technical_sheets",
        type: "BOOLEAN",
        definitionActive: true,
        enabled: true,
        limitValue: null,
      },
      {
        key: "ai_imports_monthly",
        type: "QUOTA",
        definitionActive: true,
        enabled: true,
        limitValue: 100,
      },
    ],
    prices: [
      {
        status: "ACTIVE",
        currency: "BRL",
        amountMinor: 12990,
        billingInterval: "MONTHLY",
      },
    ],
    ...overrides,
  };
}

test("aceita chave estável sem nome de plano", () => {
  assert.equal(requireStableCatalogKey("technical_sheet_ai"), "technical_sheet_ai");
  assert.throws(() => requireStableCatalogKey("Pro Feature"), CatalogInvariantError);
});

test("publica contrato pago completo sem depender do nome do plano", () => {
  assert.doesNotThrow(() => assertPlanVersionPublishable(validPublication()));
});

test("nega publicação repetida ou versão inválida", () => {
  assert.throws(
    () => assertPlanVersionPublishable(validPublication({ status: "PUBLISHED" })),
    (error: unknown) => error instanceof CatalogInvariantError && error.code === "NOT_DRAFT",
  );
  assert.throws(
    () => assertPlanVersionPublishable(validPublication({ versionNumber: 0 })),
    (error: unknown) => error instanceof CatalogInvariantError && error.code === "INVALID_VERSION",
  );
});

test("plano pago exige preço ativo em centavos", () => {
  assert.throws(
    () => assertPlanVersionPublishable(validPublication({ prices: [] })),
    (error: unknown) => error instanceof CatalogInvariantError && error.code === "PRICE_REQUIRED",
  );
  assert.throws(
    () => assertPlanVersionPublishable(validPublication({
      prices: [{ status: "ACTIVE", currency: "BRL", amountMinor: 12.5, billingInterval: "MONTHLY" }],
    })),
    (error: unknown) => error instanceof CatalogInvariantError && error.code === "INVALID_PRICE",
  );
});

test("converte valor BRL para centavos sem usar ponto flutuante como autoridade", () => {
  assert.equal(parseBrlAmountToMinor("129,90"), 12990);
  assert.equal(parseBrlAmountToMinor("R$ 49.5"), 4950);
  assert.throws(() => parseBrlAmountToMinor("12,345"), CatalogInvariantError);
  assert.throws(() => parseBrlAmountToMinor("0"), CatalogInvariantError);
});

test("plano gratuito não carrega preço ativo", () => {
  assert.doesNotThrow(() => assertPlanVersionPublishable(validPublication({ isPaid: false, prices: [] })));
  assert.throws(
    () => assertPlanVersionPublishable(validPublication({ isPaid: false })),
    (error: unknown) => error instanceof CatalogInvariantError && error.code === "FREE_PLAN_WITH_PRICE",
  );
});

test("feature quantitativa exige limite e feature booleana o rejeita", () => {
  assert.throws(
    () => assertPlanVersionPublishable(validPublication({
      features: [{ key: "seats_max", type: "SEAT_LIMIT", definitionActive: true, enabled: true, limitValue: null }],
    })),
    (error: unknown) => error instanceof CatalogInvariantError && error.code === "INVALID_FEATURE_LIMIT",
  );
  assert.throws(
    () => assertPlanVersionPublishable(validPublication({
      features: [{ key: "api_access", type: "BOOLEAN", definitionActive: true, enabled: true, limitValue: 1 }],
    })),
    (error: unknown) => error instanceof CatalogInvariantError && error.code === "INVALID_FEATURE_LIMIT",
  );
});

test("nega features inativas e duplicidades de composição ou preço", () => {
  assert.throws(
    () => assertPlanVersionPublishable(validPublication({
      features: [{ key: "api_access", type: "BOOLEAN", definitionActive: false, enabled: true, limitValue: null }],
    })),
    (error: unknown) => error instanceof CatalogInvariantError && error.code === "INACTIVE_FEATURE",
  );
  assert.throws(
    () => assertPlanVersionPublishable(validPublication({
      features: [
        { key: "api_access", type: "BOOLEAN", definitionActive: true, enabled: true, limitValue: null },
        { key: "api_access", type: "BOOLEAN", definitionActive: true, enabled: false, limitValue: null },
      ],
    })),
    (error: unknown) => error instanceof CatalogInvariantError && error.code === "DUPLICATE_FEATURE",
  );
  assert.throws(
    () => assertPlanVersionPublishable(validPublication({
      prices: [
        { status: "ACTIVE", currency: "BRL", amountMinor: 12990, billingInterval: "MONTHLY" },
        { status: "ACTIVE", currency: "BRL", amountMinor: 14990, billingInterval: "MONTHLY" },
      ],
    })),
    (error: unknown) => error instanceof CatalogInvariantError && error.code === "DUPLICATE_PRICE",
  );
});
