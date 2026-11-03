import assert from "node:assert/strict";
import test from "node:test";

import {
  canApprovePrivilegedSession,
  parsePrivilegedDuration,
  privilegedSessionCoversScope,
  requiresIndependentApproval,
  requiresPrivilegedSession,
  sanitizePrivilegedJustification,
  sanitizePrivilegedTarget,
} from "./privileged-session";

const now = new Date("2026-08-27T20:00:00.000Z");
const active = {
  permissionKey: "platform.entitlements.override",
  targetType: "ORGANIZATION",
  targetId: "org-a",
  sessionBindingHash: "a".repeat(64),
  status: "ACTIVE" as const,
  startedAt: new Date(now.getTime() - 1_000),
  expiresAt: new Date(now.getTime() + 60_000),
};

test("HIGH e CRITICAL exigem step-up; somente CRITICAL exige maker-checker", () => {
  assert.equal(requiresPrivilegedSession("MEDIUM"), false);
  assert.equal(requiresPrivilegedSession("HIGH"), true);
  assert.equal(requiresPrivilegedSession("CRITICAL"), true);
  assert.equal(requiresIndependentApproval("HIGH"), false);
  assert.equal(requiresIndependentApproval("CRITICAL"), true);
});

test("sessão ativa cobre apenas permissão, destino e cookie vinculados", () => {
  assert.equal(privilegedSessionCoversScope(active, active, now), true);
  assert.equal(privilegedSessionCoversScope(active, { ...active, permissionKey: "platform.catalog.publish" }, now), false);
  assert.equal(privilegedSessionCoversScope(active, { ...active, targetId: "org-b" }, now), false);
  assert.equal(privilegedSessionCoversScope(active, { ...active, sessionBindingHash: "b".repeat(64) }, now), false);
});

test("sessão expirada, revogada ou ainda não iniciada nunca autoriza", () => {
  assert.equal(privilegedSessionCoversScope({ ...active, expiresAt: now }, active, now), false);
  assert.equal(privilegedSessionCoversScope({ ...active, status: "REVOKED" }, active, now), false);
  assert.equal(privilegedSessionCoversScope({ ...active, startedAt: null }, active, now), false);
});

test("aprovação crítica rejeita autoaprovação e pedido vencido", () => {
  assert.equal(canApprovePrivilegedSession({ requestedByUserId: "maker", approverUserId: "checker", status: "PENDING_APPROVAL", expiresAt: active.expiresAt, now }), true);
  assert.equal(canApprovePrivilegedSession({ requestedByUserId: "maker", approverUserId: "maker", status: "PENDING_APPROVAL", expiresAt: active.expiresAt, now }), false);
  assert.equal(canApprovePrivilegedSession({ requestedByUserId: "maker", approverUserId: "checker", status: "PENDING_APPROVAL", expiresAt: now, now }), false);
});

test("entrada valida duração, justificativa e escopo em pares", () => {
  assert.equal(parsePrivilegedDuration("15"), 15);
  assert.throws(() => parsePrivilegedDuration("30"), /5, 10 ou 15/);
  assert.equal(sanitizePrivilegedJustification("  manutenção   autorizada  "), "manutenção autorizada");
  assert.deepEqual(sanitizePrivilegedTarget("organization", "org-a"), { targetType: "ORGANIZATION", targetId: "org-a" });
  assert.throws(() => sanitizePrivilegedTarget("ORGANIZATION", ""), /juntos/);
});
