import assert from "node:assert/strict";
import test from "node:test";
import { formatAiError } from "./ai-errors.ts";

test("maps no-endpoints to unavailable model copy", () => {
  const msg = formatAiError("404 No endpoints found for tencent/hy3:free", {
    model: "tencent/hy3:free",
    modelLabel: "HY3",
  });
  assert.match(msg, /HY3/);
  assert.match(msg, /isn’t available|isn't available/i);
  assert.match(msg, /picker/i);
});

test("maps rate limit", () => {
  assert.match(formatAiError("429 Too Many Requests"), /rate-limited/i);
});

test("maps auth", () => {
  assert.match(formatAiError("Unauthorized 401"), /key rejected/i);
});
