import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createEditSecret,
  createViewToken,
  hashEditSecret,
  verifyEditSecret,
  verifyViewToken,
  createAuthToken,
  verifyAuthToken,
  hashPassword,
  verifyPassword,
} from "../src/auth.ts";

const secret = "worker-test-secret";

describe("worker auth", () => {
  it("hashes edit secrets and verifies them", () => {
    const edit = createEditSecret();
    const hashed = hashEditSecret(edit);
    assert.match(hashed, /^sha256:/);
    assert.equal(verifyEditSecret(edit, hashed), true);
    assert.equal(verifyEditSecret("nope", hashed), false);
    assert.equal(verifyEditSecret(edit, edit), true);
  });

  it("mints view and auth tokens", () => {
    const view = createViewToken("roomone1", secret);
    assert.equal(verifyViewToken("roomone1", view, secret), true);
    assert.equal(verifyViewToken("roomtwo2", view, secret), false);
    const auth = createAuthToken("roomone1", secret);
    assert.equal(verifyAuthToken("roomone1", auth, secret), true);
  });

  it("hashes passwords with scrypt", () => {
    const stored = hashPassword("secret-pin");
    assert.equal(verifyPassword("secret-pin", stored), true);
    assert.equal(verifyPassword("wrong", stored), false);
  });
});
