import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";

const require = createRequire(import.meta.url);
const {
  createViewToken,
  verifyViewToken,
} = require("../scripts/y-ws/room-auth.js");

describe("room-auth view tokens", () => {
  it("mints a stable token for room + secret", () => {
    const a = createViewToken("abcdef0123456789", "test-secret");
    const b = createViewToken("abcdef0123456789", "test-secret");
    assert.equal(a, b);
    assert.equal(a.length, 22);
  });

  it("verifies matching tokens and rejects wrong room or secret", () => {
    const token = createViewToken("room-one", "sec");
    assert.equal(verifyViewToken("room-one", token, "sec"), true);
    assert.equal(verifyViewToken("room-two", token, "sec"), false);
    assert.equal(verifyViewToken("room-one", token, "other"), false);
    assert.equal(verifyViewToken("room-one", "", "sec"), false);
    assert.equal(verifyViewToken("room-one", null, "sec"), false);
  });
});
