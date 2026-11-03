import test from "node:test";
import assert from "node:assert/strict";
import { validateStagingInput } from "./prepare-staging-owner.mjs";

const valid = {
  SOIZI_STAGING_DATABASE_URL: "postgresql://test:ignored@ep-example.neon.tech/testdb?sslmode=require",
  SOIZI_STAGING_EXPECTED_HOST: "ep-example.neon.tech",
  SOIZI_STAGING_EXPECTED_DATABASE: "testdb",
  SOIZI_STAGING_PASSWORD: "Strong!Random#1234",
  SOIZI_STAGING_CONFIRM: "CONFIRMO_HOMOLOGACAO",
};

test("aceita somente alvo e confirmação explícitos", () => {
  assert.equal(validateStagingInput(valid).database, "testdb");
  assert.throws(() => validateStagingInput({ ...valid, SOIZI_STAGING_CONFIRM: "" }));
  assert.throws(() => validateStagingInput({ ...valid, SOIZI_STAGING_EXPECTED_HOST: "ep-other.neon.tech" }));
  assert.throws(() => validateStagingInput({ ...valid, SOIZI_STAGING_EXPECTED_DATABASE: "production" }));
  assert.throws(() => validateStagingInput({ ...valid, SOIZI_STAGING_DATABASE_URL: "postgresql://test:ignored@ep-example.neon.tech/testdb" }));
  assert.throws(() => validateStagingInput({ ...valid, SOIZI_STAGING_DATABASE_URL: "postgresql://test:ignored@localhost/testdb?sslmode=require", SOIZI_STAGING_EXPECTED_HOST: "localhost" }));
});

test("recusa senha previsível ou incompleta", () => {
  for (const password of ["Admin@123", "abcdefghijklmnop", "ADMIN-1234567890!", "Abc123!   "]) {
    assert.throws(() => validateStagingInput({ ...valid, SOIZI_STAGING_PASSWORD: password }));
  }
});
