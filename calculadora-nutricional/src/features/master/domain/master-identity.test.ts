import assert from "node:assert/strict";
import test from "node:test";

import { isInternalMasterEmail } from "./master-identity";

test("nega administração global a um administrador comum de organização", () => {
  const previousInternal = process.env.INTERNAL_MASTER_EMAILS;
  const previousLegacy = process.env.MASTER_EMAILS;
  process.env.INTERNAL_MASTER_EMAILS = "master@soizi.app";
  delete process.env.MASTER_EMAILS;

  try {
    assert.equal(isInternalMasterEmail("admin@cliente.com"), false);
    assert.equal(isInternalMasterEmail("MASTER@SOIZI.APP"), true);
  } finally {
    if (previousInternal === undefined) delete process.env.INTERNAL_MASTER_EMAILS;
    else process.env.INTERNAL_MASTER_EMAILS = previousInternal;
    if (previousLegacy === undefined) delete process.env.MASTER_EMAILS;
    else process.env.MASTER_EMAILS = previousLegacy;
  }
});
