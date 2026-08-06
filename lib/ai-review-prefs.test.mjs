import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  DEFAULT_AI_REVIEW_PREFS,
  loadAiReviewPrefs,
  saveAiApplyMode,
  saveAiShowInPreview,
} from "./ai-review-prefs.ts";

const mem = new Map();

beforeEach(() => {
  mem.clear();
  globalThis.localStorage = {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => {
      mem.set(k, String(v));
    },
    removeItem: (k) => {
      mem.delete(k);
    },
    clear: () => mem.clear(),
    key: () => null,
    length: 0,
  };
});

describe("ai-review-prefs", () => {
  it("defaults to confirm and preview off", () => {
    assert.deepEqual(loadAiReviewPrefs(), DEFAULT_AI_REVIEW_PREFS);
  });

  it("persists apply mode and preview flag", () => {
    saveAiApplyMode("auto");
    saveAiShowInPreview(true);
    assert.deepEqual(loadAiReviewPrefs(), {
      applyMode: "auto",
      showInPreview: true,
    });
  });
});
