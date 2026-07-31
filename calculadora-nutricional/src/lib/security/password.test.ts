import assert from "node:assert/strict";
import test from "node:test";

import {
    MAX_PASSWORD_LENGTH,
    MIN_PASSWORD_LENGTH,
    validatePasswordStrength,
} from "./password";

test("accepts a password at the configured length boundary", () => {
    const password = `A${"b".repeat(MIN_PASSWORD_LENGTH - 3)}1!`;

    assert.equal(password.length, MIN_PASSWORD_LENGTH);
    assert.equal(validatePasswordStrength(password), null);
});

test("rejects passwords above the configured maximum", () => {
    const password = `A${"b".repeat(MAX_PASSWORD_LENGTH - 1)}`;

    assert.equal(password.length, MAX_PASSWORD_LENGTH);
    assert.equal(validatePasswordStrength(`${password}1`), `A senha deve ter no máximo ${MAX_PASSWORD_LENGTH} caracteres.`);
});
