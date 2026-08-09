import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AI_USAGE_TRAILER_PREFIX,
  formatAiUsageLabel,
  formatAiUsageTrailer,
  normalizeAiUsage,
  stripAiUsageTrailer,
} from "./ai-usage.ts";

describe("ai-usage", () => {
  it("normalizes provider usage shapes", () => {
    assert.deepEqual(
      normalizeAiUsage({ inputTokens: 10, outputTokens: 5, totalTokens: 15 }),
      { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    );
    assert.deepEqual(
      normalizeAiUsage({ promptTokens: 3, completionTokens: 2 }),
      { inputTokens: 3, outputTokens: 2, totalTokens: 5 },
    );
    assert.equal(normalizeAiUsage({}), null);
  });

  it("round-trips stream trailers", () => {
    const body = "Hello step 1.";
    const trailer = formatAiUsageTrailer({
      inputTokens: 100,
      outputTokens: 40,
      totalTokens: 140,
    });
    const parsed = stripAiUsageTrailer(body + trailer);
    assert.equal(parsed.message, body);
    assert.deepEqual(parsed.usage, {
      inputTokens: 100,
      outputTokens: 40,
      totalTokens: 140,
    });
    assert.ok(trailer.includes(AI_USAGE_TRAILER_PREFIX));
  });

  it("formats compact labels", () => {
    assert.equal(
      formatAiUsageLabel({ inputTokens: 1200, outputTokens: 340, totalTokens: 1540 }),
      "1.2k → 340 · 1.5k tok",
    );
  });
});
