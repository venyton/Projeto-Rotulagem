import test from "node:test";
import assert from "node:assert/strict";

import { monthlyUsagePeriod, validateUsageRecord } from "./usage-metering";

test("período mensal usa fronteiras UTC e vira o ano corretamente", () => {
  const period = monthlyUsagePeriod(new Date("2026-12-31T23:59:59.999Z"));
  assert.equal(period.start.toISOString(), "2026-12-01T00:00:00.000Z");
  assert.equal(period.end.toISOString(), "2027-01-01T00:00:00.000Z");
});

test("registro rejeita quantidade, custo e chaves não autoritativas", () => {
  assert.throws(() => validateUsageRecord({ metricKey: "AI Import", idempotencyKey: "document:1", source: "server.action", quantity: 1, costMinor: 0 }));
  assert.throws(() => validateUsageRecord({ metricKey: "ai_imports", idempotencyKey: "short", source: "server.action", quantity: 1, costMinor: 0 }));
  assert.throws(() => validateUsageRecord({ metricKey: "ai_imports", idempotencyKey: "document:1", source: "server.action", quantity: 0, costMinor: 0 }));
  assert.throws(() => validateUsageRecord({ metricKey: "ai_imports", idempotencyKey: "document:1", source: "server.action", quantity: 1, costMinor: -1 }));
});

test("registro válido é normalizado sem aceitar payload livre", () => {
  assert.deepEqual(validateUsageRecord({ metricKey: " ai_imports_monthly ", idempotencyKey: " document:123 ", source: " server.action ", quantity: 2, costMinor: 15 }), {
    metricKey: "ai_imports_monthly",
    idempotencyKey: "document:123",
    source: "server.action",
    quantity: 2,
    costMinor: 15,
  });
});
