import assert from "node:assert/strict";
import test from "node:test";

import { hasEffectiveModuleAccess, type ModuleAccessInput } from "./module-access";
import { ALL_SAAS_MODULES, DEFAULT_WORKSPACE_MODULES, MODULE_CATALOG, SAAS_MODULES } from "./modules";

const baseInput: ModuleAccessInput = {
  moduleKey: SAAS_MODULES.TABLES,
  now: new Date("2026-07-14T12:00:00.000Z"),
  organizationEntitlements: [{ moduleKey: SAAS_MODULES.TABLES, enabled: true }],
  profilePermissions: [{ moduleKey: SAAS_MODULES.TABLES, enabled: true }],
  hasProfile: true,
  role: "MEMBER",
  memberGrants: [],
  profileControlledModules: ALL_SAAS_MODULES,
};

test("catálogo, perfil e workspace cobrem todos os módulos existentes", () => {
  const expected = new Set(Object.values(SAAS_MODULES));
  const exposedModules = new Set(Object.values(SAAS_MODULES).filter((moduleKey) => moduleKey !== SAAS_MODULES.API_ACCESS));
  assert.deepEqual(new Set(ALL_SAAS_MODULES), expected);
  assert.deepEqual(new Set(DEFAULT_WORKSPACE_MODULES), expected);
  assert.deepEqual(new Set(MODULE_CATALOG.map((module) => module.key)), exposedModules);
  assert.equal(
    MODULE_CATALOG.filter((module) => module.surface === "navigation").every((module) => Boolean(module.href)),
    true,
  );
});

test("nega quando o módulo não pertence ao plano da organização", () => {
  assert.equal(hasEffectiveModuleAccess({ ...baseInput, organizationEntitlements: [] }), false);
});

test("nega quando o perfil desativa o módulo, inclusive para admin", () => {
  assert.equal(
    hasEffectiveModuleAccess({
      ...baseInput,
      role: "ADMIN",
      profilePermissions: [{ moduleKey: SAAS_MODULES.TABLES, enabled: false }],
    }),
    false,
  );
});

test("libera quando plano e perfil ativam o módulo", () => {
  assert.equal(hasEffectiveModuleAccess(baseInput), true);
});

test("nega por padrão módulo controlado ausente do perfil", () => {
  assert.equal(hasEffectiveModuleAccess({ ...baseInput, profilePermissions: [] }), false);
});

test("admin sem perfil herda os módulos ativos da organização", () => {
  assert.equal(
    hasEffectiveModuleAccess({
      ...baseInput,
      role: "ADMIN",
      hasProfile: false,
      profilePermissions: null,
    }),
    true,
  );
});

test("grant individual expirado não libera módulo", () => {
  assert.equal(
    hasEffectiveModuleAccess({
      ...baseInput,
      hasProfile: false,
      profilePermissions: null,
      memberGrants: [{
        moduleKey: SAAS_MODULES.TABLES,
        enabled: true,
        expiresAt: new Date("2026-07-14T11:59:59.000Z"),
      }],
    }),
    false,
  );
});
