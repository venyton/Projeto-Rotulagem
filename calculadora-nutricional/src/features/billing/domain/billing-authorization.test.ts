import assert from "node:assert/strict";
import test from "node:test";

import { canManageOrganizationBilling } from "./billing-authorization";

test("billing customer-side é restrito a owner/admin e papel legado não ganha acesso", () => {
  assert.equal(canManageOrganizationBilling("OWNER"), true);
  assert.equal(canManageOrganizationBilling("ADMIN"), true);
  assert.equal(canManageOrganizationBilling("MEMBER"), false);
  assert.equal(canManageOrganizationBilling("BILLING"), false);
});
