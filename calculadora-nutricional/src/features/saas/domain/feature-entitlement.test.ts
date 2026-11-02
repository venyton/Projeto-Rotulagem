import assert from "node:assert/strict";
import test from "node:test";

import { resolveFeatureEntitlement, type FeatureEntitlementInput } from "./feature-entitlement";

const now = new Date("2026-08-25T20:00:00.000Z");
const base: FeatureEntitlementInput = {
  featureKey: "ai_imports_monthly",
  featureType: "QUOTA",
  moduleKey: "AI_IMPORT",
  organizationStatus: "ACTIVE",
  policyVersion: 2,
  at: now,
  overrides: [],
  grants: [],
  planFeature: null,
  legacyModules: [],
};

function timed(id: string, offset = 0) {
  return {
    id,
    startsAt: new Date(now.getTime() - 60_000),
    expiresAt: new Date(now.getTime() + 60_000),
    createdAt: new Date(now.getTime() + offset),
  };
}

test("nega por padrão na política atual", () => {
  assert.deepEqual(resolveFeatureEntitlement(base), {
    featureKey: "ai_imports_monthly",
    enabled: false,
    limit: null,
    source: "DEFAULT_DENY",
    validUntil: null,
    reasonCode: "not_entitled",
  });
});

test("bloqueio da organização vence todas as fontes", () => {
  const result = resolveFeatureEntitlement({
    ...base,
    organizationStatus: "SUSPENDED",
    overrides: [{ ...timed("override"), mode: "ENABLE", limitValue: null }],
    grants: [{ ...timed("grant"), enabled: true, limitValue: 500 }],
    planFeature: { enabled: true, limitValue: 100, validUntil: null },
  });
  assert.equal(result.enabled, false);
  assert.equal(result.source, "ORGANIZATION_BLOCK");
});

test("override explícito vence grant e plano", () => {
  const disabled = resolveFeatureEntitlement({
    ...base,
    overrides: [{ ...timed("disable"), mode: "DISABLE", limitValue: null }],
    grants: [{ ...timed("grant"), enabled: true, limitValue: 500 }],
    planFeature: { enabled: true, limitValue: 100, validUntil: null },
  });
  assert.equal(disabled.reasonCode, "override_disable");
  assert.equal(disabled.enabled, false);

  const limited = resolveFeatureEntitlement({
    ...base,
    overrides: [{ ...timed("limit"), mode: "SET_LIMIT", limitValue: 20 }],
    planFeature: { enabled: true, limitValue: 100, validUntil: null },
  });
  assert.equal(limited.limit, 20);
  assert.equal(limited.source, "OVERRIDE");
});

test("grant temporário válido vence composição do plano", () => {
  const result = resolveFeatureEntitlement({
    ...base,
    grants: [{ ...timed("grant"), enabled: true, limitValue: 250 }],
    planFeature: { enabled: true, limitValue: 100, validUntil: null },
  });
  assert.equal(result.limit, 250);
  assert.equal(result.source, "GRANT");
});

test("plano versionado fornece entitlement e limite", () => {
  const result = resolveFeatureEntitlement({
    ...base,
    planFeature: { enabled: true, limitValue: 100, validUntil: new Date("2026-09-01T00:00:00.000Z") },
  });
  assert.equal(result.enabled, true);
  assert.equal(result.limit, 100);
  assert.equal(result.source, "PLAN_VERSION");
});

test("compatibilidade explícita usa módulo legado e política v1", () => {
  const explicit = resolveFeatureEntitlement({
    ...base,
    legacyModules: [{ moduleKey: "AI_IMPORT", enabled: true, usageLimit: 12, expiresAt: null }],
  });
  assert.equal(explicit.source, "LEGACY_MODULE");
  assert.equal(explicit.limit, 12);

  const fallback = resolveFeatureEntitlement({ ...base, policyVersion: 1 });
  assert.equal(fallback.enabled, true);
  assert.equal(fallback.source, "LEGACY_POLICY_V1");
});

test("fontes expiradas são ignoradas e boolean nunca recebe limite", () => {
  const expired = { ...timed("expired"), expiresAt: new Date(now.getTime() - 1) };
  const result = resolveFeatureEntitlement({
    ...base,
    featureKey: "api_access",
    featureType: "BOOLEAN",
    moduleKey: "API_ACCESS",
    overrides: [{ ...expired, mode: "ENABLE", limitValue: null }],
    grants: [{ ...expired, enabled: true, limitValue: 20 }],
    planFeature: { enabled: true, limitValue: 999, validUntil: null },
  });
  assert.equal(result.source, "PLAN_VERSION");
  assert.equal(result.limit, null);
});

test("override mais recente é determinístico", () => {
  const result = resolveFeatureEntitlement({
    ...base,
    overrides: [
      { ...timed("older", -1000), mode: "ENABLE", limitValue: null },
      { ...timed("newer", 1000), mode: "DISABLE", limitValue: null },
    ],
  });
  assert.equal(result.reasonCode, "override_disable");
});
