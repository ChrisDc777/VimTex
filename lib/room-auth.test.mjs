import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const {
  createViewToken,
  verifyViewToken,
  createAuthToken,
  verifyAuthToken,
  hashPassword,
  verifyPassword,
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

describe("room-auth session auth + password", () => {
  it("mints and verifies auth tokens", () => {
    const token = createAuthToken("room-a", 60_000, "sec");
    assert.equal(verifyAuthToken("room-a", token, "sec"), true);
    assert.equal(verifyAuthToken("room-b", token, "sec"), false);
  });

  it("hashes and verifies passwords", () => {
    const stored = hashPassword("secret-pin");
    assert.equal(verifyPassword("secret-pin", stored), true);
    assert.equal(verifyPassword("wrong", stored), false);
  });

  it("creates opaque edit secrets that verify timing-safely", () => {
    const {
      createEditSecret,
      verifyEditSecret,
    } = require("../scripts/y-ws/room-auth.js");
    const a = createEditSecret();
    const b = createEditSecret();
    assert.notEqual(a, b);
    assert.equal(verifyEditSecret(a, a), true);
    assert.equal(verifyEditSecret(b, a), false);
    assert.equal(verifyEditSecret("", a), false);
  });
});

describe("room-meta store", () => {
  it("persists password hash and expiry", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vimtex-meta-"));
    process.env.ROOM_DATA_DIR = dir;
    // Re-require after env so getRoomDataDir picks it up — module caches dir via function each call.
    const {
      upsertRoomMeta,
      readRoomMeta,
      isRoomExpired,
    } = require("../scripts/y-ws/room-meta.js");

    const meta = upsertRoomMeta("abcd1234efgh5678", {
      passwordHash: "salt:hash",
      expiresAt: Date.now() + 60_000,
      editSecret: "edit-secret-value",
    });
    assert.equal(meta.passwordHash, "salt:hash");
    assert.equal(meta.editSecret, "edit-secret-value");
    assert.equal(isRoomExpired(meta), false);

    const loaded = readRoomMeta("abcd1234efgh5678");
    assert.ok(loaded);
    assert.equal(loaded.passwordHash, "salt:hash");
    assert.equal(loaded.editSecret, "edit-secret-value");

    const expired = upsertRoomMeta("abcd1234efgh5678", {
      expiresAt: Date.now() - 1000,
    });
    assert.equal(isRoomExpired(expired), true);

    fs.rmSync(dir, { recursive: true, force: true });
    delete process.env.ROOM_DATA_DIR;
  });
});
