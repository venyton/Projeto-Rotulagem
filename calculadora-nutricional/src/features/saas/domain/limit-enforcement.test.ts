import assert from "node:assert/strict";
import test from "node:test";

import { countBillableSeats, evaluateEntitlementLimit } from "./limit-enforcement";

test("nega consumo sem entitlement", () => {
  const decision = evaluateEntitlementLimit({ enabled: false, limit: 100, usage: 0, requested: 1 });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "not_entitled");
});

test("limite nulo representa acesso sem quota numérica", () => {
  const decision = evaluateEntitlementLimit({ enabled: true, limit: null, usage: 999, requested: 50 });
  assert.equal(decision.allowed, true);
  assert.equal(decision.remaining, null);
});

test("inclui a solicitação ao conferir fronteira da quota", () => {
  assert.equal(evaluateEntitlementLimit({ enabled: true, limit: 10, usage: 9, requested: 1 }).allowed, true);
  const denied = evaluateEntitlementLimit({ enabled: true, limit: 10, usage: 9, requested: 2 });
  assert.equal(denied.allowed, false);
  assert.equal(denied.remaining, 1);
});

test("contagem de seats inclui membros ativos e convites pendentes", () => {
  assert.equal(countBillableSeats({ activeMemberships: 3, pendingInvitations: 2 }), 5);
});

test("usos de tenants distintos não são somados pelo avaliador", () => {
  const tenantA = evaluateEntitlementLimit({ enabled: true, limit: 10, usage: 10 });
  const tenantB = evaluateEntitlementLimit({ enabled: true, limit: 10, usage: 0 });
  assert.equal(tenantA.allowed, false);
  assert.equal(tenantB.allowed, true);
});

test("rejeita contadores fracionários ou negativos", () => {
  assert.throws(() => evaluateEntitlementLimit({ enabled: true, limit: 10, usage: -1 }));
  assert.throws(() => countBillableSeats({ activeMemberships: 1, pendingInvitations: 0.5 }));
});
