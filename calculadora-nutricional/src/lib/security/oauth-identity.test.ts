import assert from "node:assert/strict";
import test from "node:test";

import { verifiedOAuthEmail } from "./oauth-identity";

test("accepts only an explicitly verified provider email", () => {
  assert.equal(verifiedOAuthEmail({ email: "  USER@example.com ", email_verified: true }, null), "  USER@example.com ");
  assert.equal(verifiedOAuthEmail({ email: "user@example.com", email_verified: "true" }, null), null);
  assert.equal(verifiedOAuthEmail({ email: "user@example.com", email_verified: false }, null), null);
  assert.equal(verifiedOAuthEmail({ email: "user@example.com" }, null), null);
  assert.equal(verifiedOAuthEmail(null, "user@example.com"), null);
  assert.equal(verifiedOAuthEmail({ email_verified: true }, "fallback@example.com"), "fallback@example.com");
});
