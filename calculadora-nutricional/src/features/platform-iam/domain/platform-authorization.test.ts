import assert from "node:assert/strict";
import test from "node:test";

import {
  PLATFORM_PERMISSIONS,
  resolvePlatformAuthorization,
} from "./platform-authorization";

const now = new Date("2026-08-25T15:00:00.000Z");

function activeAssignment(permissionKeys: readonly string[]) {
  return {
    roleKey: "AUDITOR",
    status: "ACTIVE" as const,
    startsAt: new Date("2026-08-24T15:00:00.000Z"),
    expiresAt: new Date("2026-08-26T15:00:00.000Z"),
    permissionKeys,
  };
}

test("nega usuário comum e owner tenant sem assignment de plataforma", () => {
  const decision = resolvePlatformAuthorization({
    authenticated: true,
    requestedPermission: PLATFORM_PERMISSIONS.ACCESS,
    assignments: [],
    breakGlassEmail: false,
    twoFactorEnabled: true,
    now,
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.denialReason, "inactive_assignment");
});

test("permite somente permission explícita de assignment ativo", () => {
  const allowed = resolvePlatformAuthorization({
    authenticated: true,
    requestedPermission: PLATFORM_PERMISSIONS.AUDIT_READ,
    assignments: [activeAssignment([
      PLATFORM_PERMISSIONS.ACCESS,
      PLATFORM_PERMISSIONS.AUDIT_READ,
    ])],
    breakGlassEmail: false,
    twoFactorEnabled: false,
    now,
  });
  const denied = resolvePlatformAuthorization({
    authenticated: true,
    requestedPermission: PLATFORM_PERMISSIONS.SECURITY_OPERATORS_MANAGE,
    assignments: [activeAssignment([PLATFORM_PERMISSIONS.AUDIT_READ])],
    breakGlassEmail: false,
    twoFactorEnabled: false,
    now,
  });

  assert.equal(allowed.allowed, true);
  assert.equal(allowed.source, "ASSIGNMENT");
  assert.equal(denied.allowed, false);
  assert.equal(denied.denialReason, "permission_missing");
});

test("nega assignment suspenso, futuro ou expirado", () => {
  const templates = [
    { ...activeAssignment([PLATFORM_PERMISSIONS.ACCESS]), status: "SUSPENDED" as const },
    { ...activeAssignment([PLATFORM_PERMISSIONS.ACCESS]), startsAt: new Date("2026-08-26T15:00:00.000Z") },
    { ...activeAssignment([PLATFORM_PERMISSIONS.ACCESS]), expiresAt: new Date("2026-08-25T14:59:59.000Z") },
  ];

  for (const assignment of templates) {
    const decision = resolvePlatformAuthorization({
      authenticated: true,
      requestedPermission: PLATFORM_PERMISSIONS.ACCESS,
      assignments: [assignment],
      breakGlassEmail: false,
      twoFactorEnabled: true,
      now,
    });
    assert.equal(decision.allowed, false);
  }
});

test("break-glass exige 2FA e não depende de role tenant", () => {
  const withoutTwoFactor = resolvePlatformAuthorization({
    authenticated: true,
    requestedPermission: PLATFORM_PERMISSIONS.ACCESS,
    assignments: [],
    breakGlassEmail: true,
    twoFactorEnabled: false,
    now,
  });
  const withTwoFactor = resolvePlatformAuthorization({
    authenticated: true,
    requestedPermission: PLATFORM_PERMISSIONS.SECURITY_OPERATORS_MANAGE,
    assignments: [],
    breakGlassEmail: true,
    twoFactorEnabled: true,
    now,
  });

  assert.equal(withoutTwoFactor.allowed, false);
  assert.equal(withoutTwoFactor.denialReason, "break_glass_requires_2fa");
  assert.equal(withTwoFactor.allowed, true);
  assert.equal(withTwoFactor.source, "BREAK_GLASS");
});

test("nega identidade não autenticada mesmo se e-mail estiver na allowlist", () => {
  const decision = resolvePlatformAuthorization({
    authenticated: false,
    requestedPermission: PLATFORM_PERMISSIONS.ACCESS,
    assignments: [],
    breakGlassEmail: true,
    twoFactorEnabled: true,
    now,
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.denialReason, "unauthenticated");
});
